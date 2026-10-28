#!/bin/bash
set -e
D="$HOME/oc-scanner"; mkdir -p "$D"; R="https://raw.githubusercontent.com/johnfarah70-ops/iphone-watcher/main/mac"
launchctl unload "$HOME/Library/LaunchAgents/com.ocduo.scanner.plist" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/com.ocduo.scanner.plist"
curl -fsSL "$R/inject.js" -o "$D/inject.js"; curl -fsSL "$R/watchdog.sh" -o "$D/watchdog.sh"; chmod +x "$D/watchdog.sh"
P="$HOME/Library/LaunchAgents/com.ocduo.watchdog.plist"
cat > "$P" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.ocduo.watchdog</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$D/watchdog.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>$D/watchdog.log</string>
  <key>StandardErrorPath</key><string>$D/watchdog.log</string>
</dict></plist>
PL
P2="$HOME/Library/LaunchAgents/com.ocduo.awake.plist"
cat > "$P2" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.ocduo.awake</string>
  <key>ProgramArguments</key><array><string>/usr/bin/caffeinate</string><string>-is</string></array>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
</dict></plist>
PL
echo "First run (approve the permission popup if asked)…"
bash "$D/watchdog.sh"
launchctl unload "$P" 2>/dev/null || true; launchctl load "$P"
launchctl unload "$P2" 2>/dev/null || true; launchctl load "$P2"
echo "Done. Chrome now runs the scanner; it is re-checked every minute."
