var pkgInfo = require('./package.json');
var Service = require('webos-service');
var child_process = require('child_process');
var http = require('http');
var path = require('path');
var fs = require('fs');
var os = require('os');

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
		fs.writeFileSync('/var/lib/webosbrew/init.d/inputhook', '#!/bin/sh\n\noutput=$(luna-send -n 1 "luna://org.webosbrew.inputhook.service/start" \'{}\')\n\nif echo "$output" | grep -q \'status unknown\'; then\n	/var/lib/webosbrew/init.d/inputhook &\n	 exit\nfi\n\nif echo "$output" | grep -q \'errorText\'; then\n	rm -f /var/lib/webosbrew/init.d/inputhook\nfi');
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
		child_process.exec(dir + '/ezinject ' + target[0] + ' ' + dir + '/libphp.so ' + dir + '/lginput-hook.php ' + target[1] +	' > /tmp/ezinject-' + target[1] + '.log 2>&1');
	}
	fs.writeFileSync('/tmp/inputhook', '');
}

var types = {
	'html': 'text/html',
	'js': 'text/javascript',
	'css': 'text/css'
};

// https://github.com/dankogai/js-base64/blob/main/base64.js
var b64ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
var b64chs = Array.prototype.slice.call(b64ch);
var b64tab = (function (a) {
	var tab = {};
	a.forEach(function (c, i) { return tab[c] = i; });
	return tab;
})(b64chs);
var b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
var _fromCC = String.fromCharCode.bind(String);
function atob(asc) {
	asc = asc.replace(/\s+/g, '');
	if (!b64re.test(asc))
		throw new TypeError('malformed base64.');
		asc += '=='.slice(2 - (asc.length & 3));
		var u24, bin = '', r1, r2;
		for (var i = 0; i < asc.length;) {
			u24 = b64tab[asc.charAt(i++)] << 18
				| b64tab[asc.charAt(i++)] << 12
				| (r1 = b64tab[asc.charAt(i++)]) << 6
				| (r2 = b64tab[asc.charAt(i++)]);
			bin += r1 === 64 ? _fromCC(u24 >> 16 & 255)
				: r2 === 64 ? _fromCC(u24 >> 16 & 255, u24 >> 8 & 255)
					: _fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255);
		}
	return bin;
};

function generatePassword(len) {
	var out = '';
	
	for (var i = 0; i < len; i++) {
		out += Math.floor(Math.random() * 0x10).toString(16);
	}
	
	return out.toUpperCase();
}

function getLocalIP() {
	var interfaces = os.networkInterfaces();
	
	for (var devName in interfaces) {
		var iface = interfaces[devName];
		
		for (var i = 0; i < iface.length; i++) {
			var alias = iface[i];
			if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
				return alias.address;
			}
		}
	}
	
	return '0.0.0.0';
}

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
	
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
	
	return false;
}

if (!ensureDirectoryExistence('/home/root/.config/lginputhook/config.json')) {
	fs.writeFileSync('/home/root/.config/lginputhook/config.json', '{}');
}

function isLocalhost(ip) {
	return ip == '::1' || ip.indexOf('127.0.0.1') != -1;
}

const password = generatePassword(8);
var passwordShown = false;

function respond(res, code, headers, data) {
	if (headers) {
		res.writeHead(code, headers);
	} else {
		res.writeHead(code);
	}
	
	if (data) {
		res.write(data);
	}
	
	res.end();
}

var server = http.createServer(function (req, res) {
	var path = req.url;
	
	var header = req.headers.authorization || '';
	var token = header.split(/\s+/).pop() || '';
	var auth = atob(token);
	var parts = auth.split(/:/);
	var authUsername = parts.shift();
	var authPassword = parts.join(':');
	
	if (!isLocalhost(req.socket.remoteAddress)) {
		if (authPassword != password) {		
			respond(res, 401, {'WWW-Authenticate': 'Basic'});
			return;
		}
	}
	
	if (req.method == 'GET') {
		if (path.substring(0, 6) == '/logs/') {
			fs.readFile(path.replace('logs', 'tmp'), function (error, data) {
				if (error) {
					data = error.code + ' ' + error.path;
				}
				
				respond(res, 200, {'Content-Type': 'text/plain', 'Content-Length': data.length}, data);
			});
		} else if (path.substring(0, 4) == '/ip/') {			
			var data = getLocalIP();
			
			respond(res, 200, {'Content-Type': 'text/plain', 'Content-Length': data.length}, data);
			return;
		} else if (path.substring(0, 10) == '/password/') {
			var data = isLocalhost(req.socket.remoteAddress) ? password : '';
			
			respond(res, 200, {'Content-Type': 'text/plain', 'Content-Length': data.length}, data);
			return;
		} else if (path.substring(0, 10) == '/apps.json') {
			service.call("luna://com.webos.applicationManager/listApps", {}, function(response) {
				if (!response.payload.returnValue) response.payload.apps = [{"title": "Could not get apps: " + response.payload.errorCode + " " + response.payload.errorText, "id": "org.webosbrew.inputhook"}];
				var data = JSON.stringify(response.payload);
				
				respond(res, 200, {'Content-Type': 'application/json', 'Content-Length': data.length + 1}, data);
			});
			return;
		} else if (path.substring(0, 8) == '/config/') {
			fs.readFile('/home/root/.config/lginputhook/' + path.substring(8), function (error, data) {
				if (error) {
					data = "{}";
				}
				
				respond(res, 200, {'Content-Type': 'application/json', 'Content-Length': data.length}, data);
			});
		} else {
			if (path[path.length - 1] == '/') {
				path += 'index.html';
			}
			
			fs.readFile('./interface' + path, function (error, data) {
				if (error) {
					respond(res, error.code == 'ENOENT' ? 404 : 500);
					return;
				}
				
				respond(res, 200, {'Content-Type': types[path.split('.')[path.split('.').length - 1]] || 'text/plain', 'Content-Length': data.length}, data);
			});
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
					respond(res, 400, false, error.toString());
					return;
				}
				
				fs.writeFile('/home/root/.config/lginputhook/' + path.substring(8), data, function (error) {
					if (error) {
						respond(res, 500, false, error.code + ' ' + error.path);
					} else {
						var response = 'Successfully saved to ' + path;
						respond(res, 200, {'Content-Type': 'text/plain', 'Content-Length': response.length}, response);
					}
				});
			});
		 } else if (path == '/reboot') {
			child_process.exec('reboot');
			respond(res, 200);
			process.exit();
		} else {
			respond(res, 404);
		}
	} else {
		respond(res, 405);
	}
});

server.listen(1842);