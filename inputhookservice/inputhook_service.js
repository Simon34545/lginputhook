var pkgInfo = require('./package.json');
var Service = require('webos-service');
var child_process = require('child_process');
var http = require('http');
var fs = require('fs');

var service = new Service(pkgInfo.name);

service.activityManager.create("keepAlive", function(activity) {});

service.register('start', function(message) {
	message.respond({
		"returnValue": true,
		"response": "Started."
	});
});

service.register('autostart', function(message) {
	try {
		fs.writeFileSync('/var/lib/webosbrew/init.d/inputhook', '#!/bin/sh\n\noutput=$(luna-send -n 1 "luna://org.webosbrew.inputhook.service/start" \'{}\')\n\nif echo "$output" | grep -q \'status unknown\'; then\n  /var/lib/webosbrew/init.d/inputhook &\n  exit\nfi\n\nif echo "$output" | grep -q \'errorText\'; then\n  rm -f /var/lib/webosbrew/init.d/inputhook\nfi');
		fs.chmodSync('/var/lib/webosbrew/init.d/inputhook', '755');
		message.respond({
			"returnValue": true,
			"response": "Created autostart script."
		});
	} catch (error) {
		message.respond({
			"returnValue": false,
			"errorText": error.stack
		});
	}
});

var targetNames = ['RELEASE', 'tvservice', 'micomservice', 'lginput2', 'testapp'];

var targets = fs.readdirSync("/proc").map(function(x) {
	try {
		return [x, fs.readFileSync('/proc/' + x + '/comm', {encoding: 'utf8'}).trimRight()];
	} catch (error) {
		return null;
	}
}).filter(function(x) {
	return x != null && targetNames.indexOf(x[1]) > -1;
});

var dir = process.cwd() + '/inputhook';

fs.chmodSync(dir + '/ezinject', '777');
fs.chmodSync(dir + '/libphp.so', '777');

if (!fs.existsSync('/tmp/inputhook')) {
	for (var target of targets) {
		child_process.exec(dir + '/ezinject ' + target[0] + ' ' + dir + '/libphp.so ' + dir + '/lginput-hook.php ' + target[1] +  ' > /tmp/ezinject-' + target[1] + '.log 2>&1');
	}
	fs.writeFileSync('/tmp/inputhook', '');
}

var types = {
	'html': 'text/html',
	'js': 'text/javascript',
	'css': 'text/css'
};

var server = http.createServer(function (req, res) {
	var path = req.url;
	
	if (req.method == 'GET') {
		if (path.substring(0, 6) == '/logs/') {
			fs.readFile(path.replace('logs', 'tmp'), function (error, data) {
				if (error) {
					data = error.code + ' ' + error.path;
				}
				
				res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': data.length});
				res.write(data);
				res.end();
			});
		} else if (path.substring(0, 4) == '/ip/') {
			var interfaces = require('os').networkInterfaces();
			
			for (var devName in interfaces) {
				var iface = interfaces[devName];
				
				for (var i = 0; i < iface.length; i++) {
					var alias = iface[i];
					if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
						res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': alias.address.length});
						res.write(alias.address);
						res.end();
						return;
					}
				}
			}
			
			var data = '0.0.0.0';
			
			res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': data.length});
			res.write(data);
			res.end();
			return;
		} else if (path.substring(0, 8) == '/config/') {
			fs.readFile('.' + path, function (error, data) {
				if (error) {
					data = "{}";
				}
				
				res.writeHead(200, {'Content-Type': 'application/json', 'Content-Length': data.length});
				res.write(data);
				res.end();
			});
		} else if (path.substring(0, 11) == '/interface/') {
			if (path[path.length - 1] == '/') {
				path += 'index.html';
			}
			
			fs.readFile('.' + path, function (error, data) {
				if (error) {
					res.writeHead(error.code == 'ENOENT' ? 404 : 500);
					res.end();
					return;
				}
				
				res.writeHead(200, {'Content-Type': types[path.split('.')[path.split('.').length - 1]] || 'text/plain', 'Content-Length': data.length});
				res.write(data);
				res.end();
			});
		} else {
			res.writeHead(404);
			res.end();
		}
	} else if (req.method == 'POST') {
		if (path.substring(0, 8) == '/config/') {
			var body = [];
			
			req.on('data', function (chunk) {
				body.push(chunk);
			});
			
			req.on('end', function () {
				var data = Buffer.concat(body).toString();
				
				try {
					JSON.parse(data);
				} catch (error) {
					res.writeHead(400);
					res.write(error.toString());
					res.end();
					return;
				}
				
				fs.writeFile('.' + path, data, function (error) {
					if (error) {
						res.writeHead(500);
						res.write(error.code + ' ' + error.path);
						res.end();
						return;
					}
					
					if (path == '/config/keybinds.json') {
						var keybinds = JSON.parse(data);
						data = '<?php\n\n$keybinds = [\n';
						
						for (var bind in keybinds) {
								data += '    ' + bind + ' => [';
								for (var prop in keybinds[bind]) {
										data += JSON.stringify(prop) + ' => ' + (prop == 'command' ? '<<<COMMAND\n' + keybinds[bind][prop] + '\nCOMMAND': JSON.stringify(keybinds[bind][prop])) + ', ';
								}
								data = data.substring(0, data.length - 2) + '],\n';
						}
						
						data += '];';
						
						fs.writeFile('./inputhook/keybinds.php', data, function (error) {
							if (error) {
								res.writeHead(500);
								res.write(error.code + ' ' + error.path);
								res.end();
								return;
							}
							
							var response = 'Successfully saved to ' + path;
							res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': response.length});
							res.write(response);
							res.end();
						});
					} else {
						var response = 'Successfully saved to ' + path;
						res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': response.length});
						res.write(response);
						res.end();
					}
				});
			});
		 } else if (path == '/reboot') {
			child_process.exec('reboot');
			res.writeHead(200);
			res.end();
			process.exit();
		} else {
			res.writeHead(404);
			res.end();
		}
	} else {
		res.writeHead(405);
		res.end();
	}
});

server.listen(1842);