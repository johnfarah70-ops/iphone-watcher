import json, os, sys, urllib.parse, urllib.request, urllib.error

PARTS = {"MK1G4LL/A": "iPhone Duo 512GB Star White",
         "MK1J4LL/A": "iPhone Duo 1TB Star White"}
ZIP, MAX_MI = "92660", 40

p = {"pl": "true", "mts.0": "regular", "location": ZIP}
for i, k in enumerate(PARTS):
    p[f"parts.{i}"] = k

req = urllib.request.Request(
    "https://www.apple.com/shop/fulfillment-messages?" + urllib.parse.urlencode(p),
    headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
             "Accept": "application/json, text/plain, */*",
             "Accept-Language": "en-US,en;q=0.9",
             "Referer": "https://www.apple.com/shop/buy-iphone/iphone-duo",
             "X-Requested-With": "XMLHttpRequest"})

try:
    d = json.load(urllib.request.urlopen(req, timeout=20))
except urllib.error.HTTPError as e:
    print(f"Apple blocked the request (HTTP {e.code})")
    sys.exit(1)

hits = []
for s in d.get("body", {}).get("content", {}).get("pickupMessage", {}).get("stores", []):
    try:
        mi = float((s.get("storeDistanceWithUnit") or "0").split()[0])
    except ValueError:
        mi = 0.0
    for part, info in s.get("partsAvailability", {}).items():
        if mi <= MAX_MI and info.get("pickupDisplay") == "available":
            hits.append(f"{PARTS.get(part, part)} - Apple {s.get('storeName', '?')} ({mi:.0f} mi)")

print("\n".join(hits) or "No stock")

if hits:
    urllib.request.urlopen(urllib.request.Request(
        "https://ntfy.sh/" + os.environ["NTFY_TOPIC"],
        data="\n".join(hits).encode(),
        headers={"Title": "iPhone Duo in stock!", "Priority": "high",
                 "Email": os.environ["EMAIL"],
                 "Click": "https://www.apple.com/shop/buy-iphone"}))
