import "webostvjs/webOSTV";

const logEl = document.createElement('pre')
document.body.appendChild(logEl);

function log(str) {
	logEl.innerText += str + '\n';
}

log("Checking for root...");
webOS.service.request("luna://org.webosbrew.hbchannel.service", {
	method: "getConfiguration",
	parameters: {},
	onSuccess: function (config) {
		log(JSON.stringify(config));
		if (config.root) {
			log("Homebrew channel is elevated, attempting to elevate service...");
			webOS.service.request("luna://org.webosbrew.hbchannel.service", {
				method: "exec",
				parameters: {"command": "/media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service org.webosbrew.inputhook.service"},
				onSuccess: function (response) {
					log(response.stdoutString);
					log("Service is elevated, turning on autostart...");
					webOS.service.request("luna://org.webosbrew.inputhook.service", {
						method: "autostart",
						parameters: {},
						onSuccess: function (res) {
							log(res.response);
							log("Opening interface...");
							location.href='http://127.0.0.1:1842/interface/';
						},
						onFailure: function (error) {
							log("Failed to turn on autostart!");
							log("[" + error.errorCode + "]: " + error.errorText);
							return;
						}
					});
				},
				onFailure: function (error) {
					log("Failed to elevate service!");
					log("[" + error.errorCode + "]: " + error.errorText);
					return;
				}
			});
		} else {
			log("Cannot elevate service.");
			log("Homebrew channel must have root!");
		}
	},
	onFailure: function (error) {
		log("Failed to check for root");
		log("[" + error.errorCode + "]: " + error.errorText);
		return;
	}
});