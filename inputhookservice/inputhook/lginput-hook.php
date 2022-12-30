<?php
require_once __DIR__ . '/hookfactory.php';
require_once __DIR__ . '/keybinds.php';

$hf = new HookFactory2("
typedef struct {
    int unk1[4];
    int uinput_code;
    int unk2[9];
} keybind_info_t;
typedef struct {
    int fd;
    keybind_info_t* keybinds;
} uinput_info_t;
");

$fd = fopen("/tmp/lginput-hook-" . $argv[1] . ".log", "a");
function logmsg($str) {
    global $fd;
    fwrite($fd, $str . "\n");
    // fflush($fd);
    fsync($fd);
}

function handleKey(int $keycode, int $state) {
    global $keybinds;
    logmsg($keycode . ' => ' . $state);
    //logmsg(print_r([$keyid, $state],true));
    //var_dump($keyid, $uinput_info->keybinds[$keyid]->uinput_code, $state);

    if (isset($keybinds[$keycode])) {
        if ($keybinds[$keycode]["action"] == "exec") {
            if ($state == 1) {
                logmsg("$keycode: execing... {$keybinds[$keycode]["command"]}");
                $proc = popen($keybinds[$keycode]["command"] . " &", "w");
                if ($proc == null) {
                    logmsg("$keycode: Exec failed :(");
                } else {
                    pclose($proc);
                }
            }

            return [ "action" => "ignore" ];
        } else {
            return $keybinds[$keycode];
        }
    }

    return [
        "action" => "pass",
    ];
}

if ($hf->hasSymbol("lginput_uinput_send_button")) {
    $hf->newHook("int (*)(uinput_info_t*, int, int)", "lginput_uinput_send_button",
        function($orig, $uinput_info, $keyid, $state) {
            $result = handleKey($uinput_info->keybinds[$keyid]->uinput_code, $state);

            if ($result['action'] == 'ignore') {
                return 0;
            } else if ($result['action'] == 'replace') {
                $origKeycode = $uinput_info->keybinds[$keyid]->uinput_code;

                $uinput_info->keybinds[$keyid]->uinput_code = $result['keycode'];
                $callres = $orig($uinput_info, $keyid, $state);
                $uinput_info->keybinds[$keyid]->uinput_code = $origKeycode;

                return $callres;
            } else {
                return $orig($uinput_info, $keyid, $state);
            }
        });
} else if ($hf->hasSymbol("MICOM_FuncWriteKeyEvent")) {
    // __SINT32 MICOM_FuncWriteKeyEvent(int fd,__UINT16 type,__UINT16 code,__SINT32 value)
    $hf->newHook("int (*)(int, uint16_t, uint16_t, int32_t)", "MICOM_FuncWriteKeyEvent",
        function($orig, $fd, $type, $code, $value) {
            if ($type != 0) {
                $result = handleKey($code, $value);

                if ($result['action'] == 'ignore') {
                    return 0;
                } else if ($result['action'] == 'replace') {
                    return $orig($fd, $type, $result['keycode'], $value);
                } else {
                    return $orig($fd, $type, $code, $value);
                }
            } else {
                return $orig($fd, $type, $code, $value);
            }
        });
}

while (true) { sleep(1); }