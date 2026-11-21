import "webostvjs/webOSTV";

var INTERFACE = 'http://127.0.0.1:1842/';
var logEl = null;

function step(str) {
	var el = document.getElementById('step');
	if (el) el.innerText = str;
}

function log(str) {
	if (!logEl) {
		logEl = document.createElement('pre');
		document.body.appendChild(logEl);
		var splash = document.getElementById('splash');
		if (splash) splash.style.display = 'none';
	}
	logEl.innerText += str + '\n';
}

function fail(str, error) {
	log(str);
	if (error) log("[" + error.errorCode + "]: " + error.errorText);
}

function request(uri, method, parameters, onSuccess, onFailure) {
	webOS.service.request(uri, {
		method: method,
		parameters: parameters || {},
		onSuccess: onSuccess,
		onFailure: onFailure
	});
}

function openInterface() {
	step("Opening…");
	location.href = INTERFACE;
}

function ensureAutostart(then) {
	step("Turning on autostart…");
	request("luna://org.webosbrew.inputhook.service", "autostart", {}, then, function (error) {
		fail("Failed to turn on autostart!", error);
	});
}

// Slow path, needed after the app is installed or updated: elevate the service through Homebrew Channel.
function elevateAndOpen() {
	step("Checking for root…");
	request("luna://org.webosbrew.hbchannel.service", "getConfiguration", {}, function (config) {
		if (!config.root) {
			fail("Cannot elevate service. Homebrew Channel must have root!");
			return;
		}
		step("Elevating the service (first launch after an install or update)…");
		request("luna://org.webosbrew.hbchannel.service", "exec", {
			"command": "/media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service org.webosbrew.inputhook.service"
		}, function () {
			ensureAutostart(openInterface);
		}, function (error) {
			fail("Failed to elevate service!", error);
		});
	}, function (error) {
		fail("Failed to check for root! Do you have the homebrew channel installed? Are you rooted? The root status in the homebrew channel settings needs to say ok.", error);
	});
}

// Fast path: if the service already runs as root, open the interface straight away.
step("Starting…");
request("luna://org.webosbrew.inputhook.service", "status", {}, function (status) {
	if (!status.root) {
		elevateAndOpen();
	} else if (!status.autostart) {
		ensureAutostart(openInterface);
	} else {
		openInterface();
	}
}, function () {
	// older service without "status", or not running yet
	elevateAndOpen();
});
