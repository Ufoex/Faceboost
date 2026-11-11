#!/bin/sh
# Saves what the debug build's recorder (app/src/debug/res/raw/debug_recorder.js) logged, for later debugging.
#   scripts/debug-log.sh            dump what logcat still holds to debug-logs/<date>.jsonl
#   scripts/debug-log.sh -f         keep recording until Ctrl+C
# Bigger logcat buffer so a long session is not lost (once per boot):  adb logcat -G 16M
mkdir -p "$(dirname "$0")/../debug-logs"
out="$(dirname "$0")/../debug-logs/$(date +%Y%m%d-%H%M%S).jsonl"
if [ "$1" = "-f" ]; then flag=""; else flag="-d"; fi
adb logcat $flag -v epoch -s chromium | grep --line-buffered '@@rec' | sed -u -E 's/^ *([0-9]+)\.[0-9]+ .*@@rec (.*)", source: .*$/{"at":\1,"rec":\2}/' > "$out"
echo "$out"
