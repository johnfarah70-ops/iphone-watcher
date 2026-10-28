#!/bin/bash
# Keeps the OC scanner running in your real Google Chrome. Run every minute by launchd.
JS="$HOME/oc-scanner/inject.js"
curl -fsSL -m 15 https://raw.githubusercontent.com/johnfarah70-ops/iphone-watcher/main/mac/inject.js -o "$JS.new" && mv "$JS.new" "$JS"
URL="https://www.apple.com/shop/buy-iphone/iphone-duo"
/usr/bin/osascript <<AS
set js to read POSIX file "$JS" as «class utf8»
tell application "Google Chrome"
  if not running then launch
  delay 1
  set found to missing value
  repeat with w in windows
    repeat with t in tabs of w
      if URL of t contains "apple.com/shop/buy-iphone/iphone-duo" then set found to t
    end repeat
  end repeat
  if found is missing value then
    set nw to make new window
    set URL of active tab of nw to "$URL"
    delay 8
    set found to active tab of nw
  end if
  if loading of found then delay 6
  set r to execute found javascript js
  log r
end tell
AS
