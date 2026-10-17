import json, os, urllib.parse, urllib.request
PARTS = {"MK1G4LL/A": "iPhone Duo 512GB Star White",
         "MK1J4LL/A": "iPhone Duo 1TB Star White"}
ZIP, MAX_MI = "92660", 40
p = {"pl": "true", "mts.0": "regular", "location": ZIP}
for i, k in enumerate(PARTS): p[f"parts.{i}"] = k
req = urllib.request.Request(
    "https://www.apple.com/shop/fulfillment-messages?" + urllib.parse.urlencode(p),
    headers={"User-Agent": "Mozilla/5.0 (Macintosh) Chrome/129.0 Safari/537.36",
             "Referer": "https://www.apple.com/shop/buy-iphone"})
d = json.load(urllib.request.urlopen(req, timeout=20))
hits = []
for s in d["body"]["content"]["pickupMessage"]["stores"]:
    mi = float((s.get("storeDistanceWithUnit") or "0").split()[0])
    for part, info in s.get("partsAvailability", {}).items():
        if mi <= MAX_MI and info.get("pickupDisplay") == "available":
            hits.append(f"{PARTS[part]} - Apple {s['storeName']} ({mi:.0f} mi)")
print("\n".join(hits) or "No stock")
if hits:
    urllib.request.urlopen(urllib.request.Request(
        "https://ntfy.sh/" + os.environ["NTFY_TOPIC"], data="\n".join(hits).encode(),
        headers={"Title": "iPhone Duo in stock!", "Priority": "high",
                 "Email": os.environ["EMAIL"],
                 "Click": "https://www.apple.com/shop/buy-iphone"}))
