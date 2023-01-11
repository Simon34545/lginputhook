# lginputhook
Allows for remapping remote buttons on LG WebOS TVs.

The [homebrew channel](https://github.com/webosbrew/webos-homebrew-channel/) with root access is required.

## How to use
The app needs to be launched at least once for it to begin working. Afterwards it will persist even across reboots.

To remap a button, press `Add keybind` in the interface.

Set the ID to the ID of the button you want to remap

Next, choose what you want to do with this button. To disable the button, choose `Disable`. To make the button execute a command, choose `Execute`, and enter the command. To replace the button with another button, choose `Replace`, and fill in the ID of the button you want to replace it with.

When you are done, press `Save changes`. The changes should be automatically applied.

To find the ID of a button, view the log files in the interface, press a button, and see what pops up. You should see something like `id => 1`. The first number is the ID of the button.

The log files you should view, depend on your WebOS version and what remote you are using. Each log is described in the dropdown menu.

Alternatively, I have collected the button IDs for every button on [this IR remote](https://www.lg.com/us/tv-audio-video-accessories/lg-AGF76631064-tv-remote-contol), which you can find listed [here](https://gist.github.com/Simon34545/31c528bfe8540880936fc4c580723a02).

## How to install
###Method 1, using webos dev manager:
1. Download the ipk file from the releases.
2. Download [webos-dev-manager](https://github.com/webosbrew/dev-manager-desktop), and open it
3. Press add device
4. Fill in your TVs information, Authentication Method should be `password`, Username should be `root`, and password should be `alpine`. The host address is the IP address of the TV.
5. In the `Apps` menu, click the Install button in the upper right corner.
6. Choose the ipk file you downloaded earlier.
7. The app should now be installed and should show up in the list. Press Launch to launch it

###Method 2, using the webos CLI:
1. Download the ipk file from the releases.
2. Install the [webos CLI](https://webostv.developer.lge.com/develop/tools/cli-installation)
3. Run the following command with the CLI, but with the IP address of your tv, and a device name: `ares-setup-device --add deviceName -i "host=ip_address" -i "port=22" -i "username=root" -i "password=alpine"`
For example: `ares-setup-device --add livingRoomTV -i "host=192.168.1.129" -i "port=22" -i "username=root" -i "password=alpine"`
4. Run this command, with the path of the ipk file, to install it. `ares-install --device deviceName /path/to/file.ipk`
5. The app should now be installed. Run `ares-launch --device deviceName org.webosbrew.inputhook` to launch it.


## How to build
To package the app into an ipk, make sure you have the [webos CLI](https://webostv.developer.lge.com/develop/tools/cli-installation) installed.
Then, run the following command:

`ares-package /path/to/inputhook /path/to/inputhookservice`

This will produce an ipk file. See the instructions above for installing it.


## Credits
[smx-smx](https://github.com/smx-smx) - Created [ezinject](https://github.com/smx-smx/ezinject), which is used to inject the inputhook into the various processes.

[Informatic](https://github.com/Informatic) - Created the original [inputhook](https://gist.github.com/Informatic/319bcaf94436b9136904473ca4f4ec9c) and [hookfactory](https://gist.github.com/Informatic/96ea5496721ccdacc43fed964e36e239) scripts.
