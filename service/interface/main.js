import 'regenerator-runtime/runtime';

var rebooting = false;

async function get(url) {
  try {
    return await fetch(url);
	} catch {
    return {text: () => ''};
  }
}

function getSync(path) {
	if (rebooting) return {};
	var req = new XMLHttpRequest();
	req.open('GET', path, false);
	try {
		req.send();
	} catch (error) {};
	return req;
}

function put(path, data) {
	if (rebooting) return {};
	var req = new XMLHttpRequest();
	req.open('POST', path, false);
	try {
		req.send(data);
	} catch (error) {};
	return req;
}

var keybinds = {};

try {
	keybinds = JSON.parse(getSync('/config/keybinds.json').responseText);
} catch(error) {};

var apps = {};

try {
	apps = JSON.parse(getSync('/apps.json').responseText);
} catch(error) {
	apps = {apps: [{"title": "Couldn't parse JSON: " + error, "id": "org.webosbrew.inputhook"}]};
};

function createLabel(parent, text) {
	var label = document.createElement('span');
	label.className = 'label';
	label.innerText = text;
	parent.appendChild(label);
	return label;
}

function deleteKeybind(binding) {
	delete keybinds[binding];
	showKeybinds();
}

function showKeybinds() {
	var keybindsDiv = document.getElementById('keybinds');
	keybindsDiv.innerHTML = '';
	for (var binding in keybinds) {
		var bindingDiv = document.createElement('div');
		bindingDiv.className = 'binding';
		
		createLabel(bindingDiv, 'ID: ')
		
		var idInput = document.createElement('input');
		idInput.type = 'number';
		idInput.setAttribute('binding', binding);
		idInput.className = 'keycode';
		idInput.value = binding;
		idInput.onchange = function() {
			var oldId = this.getAttribute('binding');
			var newId = (parseInt(this.value) || 0).toString();
			if (keybinds[newId]) {
				this.value = parseInt(oldId);
				return;
			}
			if (oldId !== newId) {
					this.setAttribute('binding', newId);
					Object.defineProperty(keybinds, newId,
							Object.getOwnPropertyDescriptor(keybinds, oldId));
					delete keybinds[oldId];
			}
		}
		bindingDiv.appendChild(idInput);
		
		createLabel(bindingDiv, 'Action: ')
		
		var action = document.createElement('select');
		var option1 = document.createElement('option');
		option1.value = 'replace';
		option1.innerText = 'Replace';
		option1.selected = keybinds[binding].action == option1.value;
		action.appendChild(option1);
		var option2 = document.createElement('option');
		option2.value = 'exec';
		option2.innerText = 'Execute';
		option2.selected = keybinds[binding].action == option2.value;
		action.appendChild(option2);
		var option3 = document.createElement('option');
		option3.value = 'ignore';
		option3.innerText = 'Disable';
		option3.selected = keybinds[binding].action == option3.value;
		action.appendChild(option3);
		var option4 = document.createElement('option');
		option4.value = 'launch';
		option4.innerText = 'Launch App';
		option4.selected = keybinds[binding].action == option4.value;
		action.appendChild(option4);
		action.onchange = function() {
			if (this.value == 'replace') {
				keybinds[this.parentNode.getElementsByClassName('keycode')[0].getAttribute('binding')] = {action: 'replace', keycode: 0};
				showKeybinds();
			} else if (this.value == 'exec') {
				keybinds[this.parentNode.getElementsByClassName('keycode')[0].getAttribute('binding')] = {action: 'exec', command: ''};
				showKeybinds();
			} else if (this.value == 'ignore') {
				keybinds[this.parentNode.getElementsByClassName('keycode')[0].getAttribute('binding')] = {action: 'ignore'};
				showKeybinds();
			} else if (this.value == 'launch') {
				keybinds[this.parentNode.getElementsByClassName('keycode')[0].getAttribute('binding')] = {action: 'launch', id: 'org.webosbrew.inputhook'};
				showKeybinds();
			}
		}
		bindingDiv.appendChild(action);
		
		if (keybinds[binding].action == 'exec') {
			bindingDiv.appendChild(document.createElement('br'));
			createLabel(bindingDiv, 'Command: ')
		
			var command = document.createElement('textarea');
			command.value = keybinds[binding].command;
			command.onchange = function() {
				keybinds[this.parentNode.getElementsByClassName('keycode')[0].getAttribute('binding')].command = this.value;
			}
			bindingDiv.appendChild(command);
		} else if (keybinds[binding].action == 'replace') {
			bindingDiv.appendChild(document.createElement('br'));
			createLabel(bindingDiv, 'Replace with ID: ')
		
			var replace = document.createElement('input');
			replace.type = 'number';
			replace.value = keybinds[binding].keycode;
			replace.onchange = function() {
				keybinds[this.parentNode.getElementsByClassName('keycode')[0].getAttribute('binding')].keycode = parseInt(this.value) || 0;
			}
			bindingDiv.appendChild(replace);
		} else if (keybinds[binding].action == 'launch') {
			bindingDiv.appendChild(document.createElement('br'));
			createLabel(bindingDiv, 'App: ')
		
			var appselect = document.createElement('select');
			for (var app of apps.apps) {
				var option = document.createElement('option');
				option.value = app.id;
				option.innerText = app.title + ' (' + app.id + ')';
				option.selected = keybinds[binding].id == app.id;
				appselect.appendChild(option);
			}
			appselect.onchange = function() {
				keybinds[this.parentNode.getElementsByClassName('keycode')[0].getAttribute('binding')].id = this.value;
			}
			bindingDiv.appendChild(appselect);
		} 
		
		bindingDiv.appendChild(document.createElement('br'));
		
		var removeButton = document.createElement('button');
		removeButton.innerText = 'Remove';
		removeButton.onclick = function() {
			delete keybinds[this.parentNode.getElementsByClassName('keycode')[0].getAttribute('binding')];
			showKeybinds();
		}
		bindingDiv.appendChild(removeButton);
		
		keybindsDiv.appendChild(bindingDiv);
	}
}

showKeybinds();

document.getElementById('create').onclick = function() {
	var highest = -1;
	
	for (var binding in keybinds) {
		highest = Math.max(highest, parseInt(binding));
	}
	
	keybinds[(highest + 1).toString()] = {action: 'ignore'};
	
	showKeybinds();
}

document.getElementById('save').onclick = function() {
	var res = put('/config/keybinds.json', JSON.stringify(keybinds));
	var str = new Date().toLocaleTimeString() + ' ';
	
	if (res.status != 200) {
		str += 'Failed! ' + res.status + ' ' + res.responseText;
		document.getElementById('status').style.color = '#F00';
	} else {
		str += res.responseText;
		document.getElementById('status').style.color = '#0F0';
	}
	
	document.getElementById('status').innerText = str;
}

document.getElementById('reboot').onclick = function() {
	put('/reboot');
	rebooting = true;
	location.reload();
}

var log = 'tvservice';

document.getElementById('log').onchange = function() {
	log = this.value;
}

var ip = getSync('/ip/').responseText;

if (ip == '') location.reload();

var password = getSync('/password/').responseText;

document.getElementById('url').innerHTML = 'To view this page on another device, go to <a href="#">http://' + (ip == '0.0.0.0' ? '<tv_ip>' : ip) + ':1842/</a> in the web browser.<br>Username can be empty. ' + (password == '' ? '<br>Launch the app to view the password.' : '<br>Password is: ' + password) ;

setInterval(async function() {
	document.getElementById('inputhook-label').innerText = 'lginput-hook-' + log + '.log';
	document.getElementById('hookfactory-label').innerText = 'hookfactory-' + log + '.log';
	document.getElementById('ezinject-label').innerText = 'ezinject-' + log + '.log';
	var log1 = document.getElementById('inputhook-log');
	var log2 = document.getElementById('hookfactory-log');
	var log3 = document.getElementById('ezinject-log');
	var scrolled1 = log1.scrollHeight - log1.clientHeight <= log1.scrollTop + 1;
	var scrolled2 = log2.scrollHeight - log2.clientHeight <= log2.scrollTop + 1;
	var scrolled3 = log3.scrollHeight - log3.clientHeight <= log3.scrollTop + 1;
	log1.innerText = await (await get('/logs/lginput-hook-' + log + '.log')).text();
	log2.innerText = await (await get('/logs/hookfactory-' + log + '.log')).text();
	log3.innerText = await (await get('/logs/ezinject-' + log + '.log')).text();
	if (scrolled1) log1.scrollTop = log1.scrollHeight - log1.clientHeight;
	if (scrolled2) log2.scrollTop = log2.scrollHeight - log2.clientHeight;
	if (scrolled3) log3.scrollTop = log3.scrollHeight - log3.clientHeight;
}, 1000);