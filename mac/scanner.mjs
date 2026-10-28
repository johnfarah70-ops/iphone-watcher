// OC Duo Scanner — keeps the tracker fed 24/7 from this Mac.
// Runs an invisible Chrome on apple.com (Apple blocks cloud servers, not real browsers),
// reads pickup availability every 5 seconds, and sends it to the tracker.
import { chromium } from "playwright";
import os from "node:os";
import path from "node:path";

const TRACKER = "https://oc-duo-tracker.vercel.app/api/ingest";
const KEY = "1423448d98ccfd8da6357c4ea5ea1df4";
const BUY = "https://www.apple.com/shop/buy-iphone/iphone-duo";
const PARTS = ["MK1F4LL/A","MK1H4LL/A","MK1L4LL/A","MK1R4LL/A","MK1E4LL/A","MK1G4LL/A","MK1J4LL/A","MK1Q4LL/A"];
const ZIPS = ["92618","92821","92691","92647"];
const EVERY_MS = 5000;
const RELOAD_EVERY_MS = 30 * 60 * 1000;

const log = (...a) => console.log(new Date().toLocaleString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const dir = path.join(os.homedir(), "oc-scanner", "profile");
  const opts = { headless: false, viewport: { width: 1280, height: 900 }, ignoreDefaultArgs: ["--enable-automation"],
    args: ["--disable-blink-features=AutomationControlled", "--window-position=-2400,-2400", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] };
  try { return await chromium.launchPersistentContext(dir, { ...opts, channel: "chrome" }); }
  catch { return await chromium.launchPersistentContext(dir, opts); }
}

async function main() {
  const ctx = await launch();
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const open = async () => { await page.goto(BUY, { waitUntil: "domcontentloaded", timeout: 60000 }); await sleep(3000); };
  await open();
  log("Scanner started");
  let lastReload = Date.now(), fails = 0, n = 0;

  for (;;) {
    const t0 = Date.now();
    try {
      const stores = await page.evaluate(async ({ PARTS, ZIPS }) => {
        const q = PARTS.map((p, i) => "parts." + i + "=" + encodeURIComponent(p)).join("&");
        const all = [];
        for (const z of ZIPS) {
          const r = await fetch("/shop/fulfillment-messages?pl=true&mts.0=regular&location=" + z + "&" + q, { credentials: "include", cache: "no-store" });
          const txt = await r.text();
          if (!txt.startsWith("{")) throw new Error("Apple blocked request (HTTP " + r.status + ")");
          const j = JSON.parse(txt);
          for (const s of j?.body?.content?.pickupMessage?.stores ?? []) {
            const pa = {};
            for (const k in s.partsAvailability ?? {}) pa[k] = { pickupDisplay: s.partsAvailability[k].pickupDisplay };
            all.push({ storeNumber: s.storeNumber, storeName: s.storeName, city: s.city, address: { postalCode: s.address?.postalCode },
              storelatitude: s.storelatitude, storelongitude: s.storelongitude, storeDistanceWithUnit: s.storeDistanceWithUnit, partsAvailability: pa });
          }
        }
        return all;
      }, { PARTS, ZIPS });
      if (!stores.length) throw new Error("Apple returned no stores");
      const res = await fetch(TRACKER, { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ key: KEY, stores }) });
      const j = await res.json().catch(() => ({}));
      fails = 0; n++;
      if (j.ready) log(`DROP — ${j.ready} store(s) ready`);
      else if (n % 60 === 0) log(`ok · ${n} scans · nothing ready`);
    } catch (e) {
      fails++;
      log("scan failed:", e.message);
      if (fails >= 3) { log("reloading Apple page"); await open().catch(() => {}); fails = 0; }
    }
    if (Date.now() - lastReload > RELOAD_EVERY_MS) { await open().catch(() => {}); lastReload = Date.now(); }
    await sleep(Math.max(0, EVERY_MS - (Date.now() - t0)));
  }
}

main().catch((e) => { log("fatal:", e.message); process.exit(1); }); // launchd restarts it
