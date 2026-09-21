#!/usr/bin/env bash
set -euo pipefail
OUT=atlas-reborn/tests/android-results
mkdir -p "$OUT"
trap 'adb logcat -d > "$OUT/logcat.txt"; adb exec-out screencap -p > "$OUT/final.png"' EXIT
adb install -r atlas-reborn/android/app/build/outputs/apk/debug/app-debug.apk
adb logcat -c
adb shell am start -W -n pl.somaskan.atlasecharuchu/.MainActivity > "$OUT/launch.txt"
sleep 12
adb shell uiautomator dump /sdcard/window.xml
adb pull /sdcard/window.xml "$OUT/title.xml"
python3 - <<'PYTHON'
import xml.etree.ElementTree as ET,re,subprocess
for n in ET.parse('atlas-reborn/tests/android-results/title.xml').iter('node'):
 if n.get('resource-id')=='android:id/ok':
  x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
  subprocess.run(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)],check=True)
PYTHON
sleep 12
adb shell uiautomator dump /sdcard/window.xml
adb pull /sdcard/window.xml "$OUT/title.xml"
adb exec-out screencap -p > "$OUT/title.png"
python3 - <<'PY'
import xml.etree.ElementTree as ET, re, subprocess
p='atlas-reborn/tests/android-results/title.xml'
nodes=ET.parse(p).iter('node')
n=next((n for n in nodes if 'Rozpocznij podróż' in n.get('text','')+n.get('content-desc','')),None)
if n is not None:
 x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
 x,y=(x1+x2)//2,(y1+y2)//2
else:
 # Pixel 2 landscape, coordinates inspected in the API 35 title screenshot.
 x,y=355,827
subprocess.run(['adb','shell','input','tap',str(x),str(y)],check=True)
PY
sleep 3
adb shell uiautomator dump /sdcard/window.xml
adb pull /sdcard/window.xml "$OUT/classes.xml"
adb exec-out screencap -p > "$OUT/classes.png"
python3 - <<'PY'
from pathlib import Path
Path('atlas-reborn/tests/android-results/REPORT.txt').write_text('API 35 debug build installed and launched. Title button tapped. Title and class screenshots require visual review because WebView DOM is absent from UIAutomator. Release signing verified separately. Physical device not tested.\n')
PY
APP_PID=$(adb shell pidof pl.somaskan.atlasecharuchu)
test -n "$APP_PID"
adb logcat --pid="$APP_PID" -d > "$OUT/app-logcat.txt"
if rg 'FATAL EXCEPTION|Fatal signal' "$OUT/app-logcat.txt"; then exit 1; fi
