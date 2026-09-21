#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:?Set ANDROID_HOME}"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17}"
: "${ATLAS_KEYSTORE:?Persistent signing key required}"
: "${ATLAS_PASSWORD_FILE:?Private password file required}"
BUILD_TOOLS="${ANDROID_HOME}/build-tools/35.0.1"
PLATFORM="${ANDROID_HOME}/platforms/android-35/android.jar"
BUILD="$(pwd)/build/manual"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$BUILD/assets" dist
cp index.html style.css "$BUILD/assets/"
cp -R src assets vendor "$BUILD/assets/"
python3 - <<'PY'
from pathlib import Path
p=Path('android/app/src/main/AndroidManifest.xml').read_text()
p=p.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">','<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="pl.somaskan.atlasecharuchu" android:versionCode="10000" android:versionName="1.0.0"><uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35"/>')
p=p.replace('<application ','<application android:debuggable="false" ',1)
Path('build/manual/AndroidManifest.xml').write_text(p)
PY
"$BUILD_TOOLS/aapt2" compile --dir android/app/src/main/res -o "$BUILD/resources.zip"
"$BUILD_TOOLS/aapt2" link -I "$PLATFORM" --manifest "$BUILD/AndroidManifest.xml" -o "$BUILD/base.apk" "$BUILD/resources.zip" -A "$BUILD/assets" --auto-add-overlay
"$JAVA_HOME/bin/javac" -source 8 -target 8 -encoding UTF-8 -bootclasspath "$PLATFORM:$BUILD_TOOLS/core-lambda-stubs.jar" -d "$BUILD/classes" android/app/src/main/java/pl/somaskan/atlasecharuchu/MainActivity.java
mapfile -t CLASS_FILES < <(find "$BUILD/classes" -name '*.class')
"$BUILD_TOOLS/d8" --lib "$PLATFORM" --min-api 26 --output "$BUILD/dex" "${CLASS_FILES[@]}"
python3 - <<'PY'
import zipfile,pathlib
p=pathlib.Path('build/manual')
with zipfile.ZipFile(p/'base.apk','a',compression=zipfile.ZIP_STORED) as z:
 for dex in (p/'dex').glob('*.dex'):z.write(dex,dex.name)
PY
"$BUILD_TOOLS/zipalign" -f -p 4 "$BUILD/base.apk" "$BUILD/aligned.apk"
"$BUILD_TOOLS/apksigner" sign --ks "$ATLAS_KEYSTORE" --ks-key-alias "${ATLAS_KEY_ALIAS:-fizjorpg}" --ks-pass "file:$ATLAS_PASSWORD_FILE" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out dist/Atlas-Echa-Ruchu-1.0.0.apk "$BUILD/aligned.apk"
"$BUILD_TOOLS/apksigner" verify --verbose dist/Atlas-Echa-Ruchu-1.0.0.apk > dist/signature.txt
"$BUILD_TOOLS/zipalign" -c -v 4 dist/Atlas-Echa-Ruchu-1.0.0.apk > dist/alignment.txt
"$BUILD_TOOLS/aapt" dump badging dist/Atlas-Echa-Ruchu-1.0.0.apk > dist/manifest.txt
sha256sum dist/Atlas-Echa-Ruchu-1.0.0.apk > dist/SHA256SUMS
echo 'APK built and signature verified.'
