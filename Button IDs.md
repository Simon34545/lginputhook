# Remote Button IDs
This file details the IDs of each of the buttons on some LG Remotes. These IDs are based on individual testing and may not always be accurate. Use them at your own discretion. 

## LG Magic Remote (Model [MR21GC](https://www.lg.com/au/tv-accessories/lg-akb76036504 "MR21GC"))
### Power Button
I have neither been able to remap nor even identify what the default mapping for the Power Button is. The input from that button is processed before the inputhook can grab it.
### Number Pad
|Button|ID|
|-|-|
|1|2|
|2|3|
|3|4|
|4|5|
|5|6|
|6|7|
|7|8|
|8|9|
|9|10|
|0|11|
|List|787|
|...|994|
### Volume & Channel Controls
|Button|ID|
|-|-|
|Volume +|115|
|Volume -|114|
|Channel +|402|
|Channel -|403|
|Mute|113|
### Other Menus / "Smart" Functions
|Button|ID|
|-|-|
|Home|773|
|Voice Assistant|428|
|Inputs|241|
|Settings|139|
### Navigation
|Button|ID|
|-|-|
|D-Pad Up|103|
|D-Pad Down|108|
|D-Pad Left|105|
|D-Pad Right|106|
|Scroll Wheel Click|272|
|Back|412|

*The scrolling of the wheel does not get logged by the input hook and so, probably cannot be remapped.*
### Colours
|Button|ID|
|-|-|
|Red|398|
|Green|399|
|Yellow|400|
|Blue|401|
### Shortcuts
|Button|ID|
|-|-|
|Netflix|1037|
|Prime Video|1038|
|Disney+|1042|
|Rakuten TV|1044|
|Google Assistant|1117|
|Alexa|1086|

## LG Magic Remote (Model MR20GA, US layout, part AKB75855501)
Tested on an LG CX (webOS 5). Most IDs match the MR21GC above; the differences are List, `...`, and the buttons the MR21GC does not have.
|Button|ID|
|-|-|
|Number pad 1-9, 0|2-10, 11 (same as above)|
|List (`-/LIST`)|771|
|`...` (AD/SAP)|994|
|Set-top box power|1021|
|Guide|362|
|Input|241|
|Home / Settings / Voice / Mute|773 / 139 / 428 / 113|
|Volume + / -, Channel + / -|115 / 114, 402 / 403|
|D-Pad, Scroll Wheel Click, Back|as above (103/108/105/106, 272, 412)|
|Red / Green / Yellow / Blue|398 / 399 / 400 / 401|
|Netflix / Prime Video|1037 / 1038|
|Movies|1083|
|Play / Pause|207 / 119|

*The interface can also learn IDs: select a button on the remote picture, press "Learn code", then press the real button.*
