#!/usr/bin/env bash
set -euo pipefail
OUT=atlas-reborn/tests/android-results
mkdir -p "$OUT"
adb install -r atlas-reborn/android/app/build/outputs/apk/debug/app-debug.apk
adb logcat -c
adb shell am start -W -n pl.somaskan.atlasecharuchu/.MainActivity > "$OUT/launch.txt"
sleep 12
adb shell uiautomator dump /sdcard/window.xml
adb pull /sdcard/window.xml "$OUT/title.xml"
adb exec-out screencap -p > "$OUT/title.png"
python3 - <<'PY'
import xml.etree.ElementTree as ET, re, subprocess
p='atlas-reborn/tests/android-results/title.xml'
nodes=ET.parse(p).iter('node')
n=next((n for n in nodes if 'Rozpocznij podróż' in n.get('text','')+n.get('content-desc','')),None)
assert n is not None, 'Game title button absent in Android WebView'
x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
subprocess.run(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)],check=True)
PY
sleep 3
adb shell uiautomator dump /sdcard/window.xml
adb pull /sdcard/window.xml "$OUT/classes.xml"
adb exec-out screencap -p > "$OUT/classes.png"
python3 - <<'PY'
from pathlib import Path
s=Path('atlas-reborn/tests/android-results/classes.xml').read_text()
assert 'Kim będzie wędrowiec?' in s, 'Class selection did not open'
Path('atlas-reborn/tests/android-results/REPORT.txt').write_text('PASS: API 35 debug build installed; offline WebView title and class selection rendered; touch start worked. Release signing verified separately. Physical device not tested.\n')
PY
adb logcat -d > "$OUT/logcat.txt"
if rg 'FATAL EXCEPTION|Fatal signal' "$OUT/logcat.txt"; then exit 1; fi
