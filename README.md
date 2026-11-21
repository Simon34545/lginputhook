# lginputhook
Allows for remapping remote buttons on LG WebOS TVs.

## The [homebrew channel](https://github.com/webosbrew/webos-homebrew-channel/) with root access is required for this to work!

## How to use
The app needs to be launched at least once for it to begin working. Afterwards it will persist even across reboots. After installing or updating the app, launch it once and restart the TV so the hook is (re)injected.

The interface shows a picture of your Magic Remote (pick the model under the picture: MR20GA, or MR21GA / MR22GA). It works with the remote on the TV (arrows, OK, Back) and in a browser on another device.

1. Select a button on the picture, or press it on the real remote: the button lights up and `Live from the remote` shows its ID.
2. Choose what it should do: **Default**, **Open app or input** (any installed app, HDMI inputs, Live TV, screen off), **Act as another key**, **Run a command**, or **Disable**. Launch and command actions can be tried right away with **Try it now**.
3. Press **Apply to TV**. The hook reloads the config within a second, and the interface confirms it.

If a button on the picture has the wrong ID (remotes differ by region), select it, press **Learn code** and press the real button. Buttons that are not on the picture can be edited by ID from **More > Edit a key by its code**. **More > History** restores the configuration from before any Apply.

To use it on a phone, press **Phone** and scan the QR code: the link carries the password (after `#`, so it never reaches the server), the page logs in by itself and the phone stays logged in. The page works on phone screens. On other devices the interface asks for the password itself (no browser popup); the password stays the same across restarts and **Advanced > New password** logs every other device out.

The **Advanced** tab shows the service status, the hook and ezinject logs for each hooked process, the raw `keybinds.json` (edit, import, download), a table of known key IDs, and a restart button.

The configuration lives in `/home/root/.config/lginputhook/keybinds.json`; keys are button IDs:
```json
{
  "1038": {"action": "launch", "id": "com.webos.app.hdmi1"},
  "398": {"action": "replace", "keycode": 168},
  "1037": {"action": "exec", "command": "luna-send -n 1 luna://com.webos.notification/createToast '{\"message\":\"hi\"}'"},
  "428": {"action": "ignore"}
}
```

Wheel scrolling and the Power button cannot be remapped. Known button IDs are listed in [Button IDs.md](Button%20IDs.md); I have also collected the button IDs for every button on [this IR remote](https://www.lg.com/us/tv-audio-video-accessories/lg-AGF76631064-tv-remote-contol), which you can find listed [here](https://gist.github.com/Simon34545/31c528bfe8540880936fc4c580723a02), and a list of [all keycodes](https://gist.github.com/Simon34545/fc5c91e0456789dd7a56a947c1148939) from a decompiled function in `network-input-service`.

## How to install
### Method 1, using webos dev manager:
1. Download the ipk file from the releases.
2. Download [webos-dev-manager](https://github.com/webosbrew/dev-manager-desktop), and open it
3. Press add device
4. Fill in your TVs information, Authentication Method should be `password`, Username should be `root`, and password should be `alpine`. The host address is the IP address of the TV.
5. In the `Apps` menu, click the Install button in the upper right corner.
6. Choose the ipk file you downloaded earlier.
7. The app should now be installed and should show up in the list. Press Launch to launch it

### Method 2, using the webos CLI:
1. Download the ipk file from the releases.
2. Install the [webos CLI](https://webostv.developer.lge.com/develop/tools/cli-installation)
3. Run the following command with the CLI, but with the IP address of your tv, and a device name: `ares-setup-device --add deviceName -i "host=ip_address" -i "port=22" -i "username=root" -i "password=alpine"`
For example: `ares-setup-device --add livingRoomTV -i "host=192.168.1.129" -i "port=22" -i "username=root" -i "password=alpine"`
4. Run this command, with the path of the ipk file, to install it. `ares-install --device deviceName /path/to/file.ipk`
5. The app should now be installed. Run `ares-launch --device deviceName org.webosbrew.inputhook` to launch it.


## How to build
1. Clone the repository
2. Run the following commands (assuming NPM is installed):

```
npm install
npm run build
npm run package
```

3. This will produce an ipk file. See the instructions above for installing it.


## Credits
[smx-smx](https://github.com/smx-smx) - Created [ezinject / hookfactory](https://github.com/smx-smx/ezinject), which is used to inject the inputhook into the various processes.

[Informatic](https://github.com/Informatic) - Created the original [inputhook](https://gist.github.com/Informatic/319bcaf94436b9136904473ca4f4ec9c) script.

[Sundermann](https://github.com/sundermann) - Created [inputhookpp](https://github.com/sundermann/inputhookpp)

Rembihnutur#6877 (717868262058360833) - Created the icon
