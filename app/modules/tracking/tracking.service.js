const crypto = require("crypto");
const ApiError = require("../../../error/ApiError");
const FacebookPixelService = require("../facebookPixel/facebookPixel.service");
const TiktokPixelService = require("../tiktokPixel/tiktokPixel.service");
const GoogleAdsService = require("../googleAds/googleAds.service");

const hash = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash("sha256").update(normalized).digest("hex");
};

const hashPhone = (value) => hash(String(value || "").replace(/\D/g, ""));
const asHashArray = (value) => value ? [value] : undefined;

const PLATFORM_EVENT_NAMES = {
  PageView: { meta: "PageView", tiktok: "Pageview" },
  ViewContent: { meta: "ViewContent", tiktok: "ViewContent" },
  InitiateCheckout: { meta: "InitiateCheckout", tiktok: "InitiateCheckout" },
  AddToCart: { meta: "AddToCart", tiktok: "AddToCart" },
  Purchase: { meta: "Purchase", tiktok: "CompletePayment" },
};

const getPlatformEventName = (eventName, platform) =>
  PLATFORM_EVENT_NAMES[eventName]?.[platform] || eventName;

const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ""));

const postJson = async (url, payload, headers = {}) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

const toMetaEvent = ({ eventName, eventId, eventSourceUrl, userData, customData, ipAddress, userAgent }) => ({
  event_name: eventName,
  event_time: Math.floor(Date.now() / 1000),
  event_id: eventId,
  action_source: "website",
  event_source_url: eventSourceUrl,
  user_data: clean({
    client_ip_address: ipAddress,
    client_user_agent: userAgent,
    em: asHashArray(hash(userData?.email)),
    ph: asHashArray(hashPhone(userData?.phone)),
    fn: asHashArray(hash(userData?.firstName || userData?.name)),
    external_id: asHashArray(hash(userData?.customerId)),
    fbp: userData?.fbp,
    fbc: userData?.fbc,
  }),
  custom_data: clean(customData || {}),
});

const sendMeta = async (payload, context) => {
  const pixels = await FacebookPixelService.getActiveFromDB();
  const results = [];
  for (const pixel of pixels) {
    const row = pixel.toJSON();
    if (!row.pixelsId || !row.metaAccessToken) continue;
    const apiVersion = process.env.META_GRAPH_API_VERSION || "v23.0";
    const url = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(row.pixelsId)}/events?access_token=${encodeURIComponent(row.metaAccessToken)}`;
    const body = {
      data: [toMetaEvent({
        ...payload,
        eventName: getPlatformEventName(payload.eventName, "meta"),
        ...context,
      })],
      ...(row.testEventId ? { test_event_code: row.testEventId } : {}),
    };
    results.push({ platform: "meta", pixelId: row.pixelsId, ...(await postJson(url, body)) });
  }
  return results;
};

const toTiktokEvent = ({ eventName, eventId, eventSourceUrl, referrerUrl, userData, customData, ipAddress, userAgent }) => ({
  event: getPlatformEventName(eventName, "tiktok"),
  event_id: eventId,
  event_time: Math.floor(Date.now() / 1000),
  user: clean({
    ip: ipAddress,
    user_agent: userAgent,
    email: hash(userData?.email),
    phone: hashPhone(userData?.phone),
    external_id: hash(userData?.customerId),
    ttclid: userData?.ttclid,
    ttp: userData?.ttp,
  }),
  properties: clean(customData || {}),
  page: clean({ url: eventSourceUrl, referrer: referrerUrl }),
});

const sendTiktok = async (payload, context) => {
  const pixels = await TiktokPixelService.getActiveFromDB();
  const results = [];
  for (const pixel of pixels) {
    const row = pixel.toJSON();
    if (!row.pixelCode || !row.accessToken) continue;
    const body = {
      pixel_code: row.pixelCode,
      event_source: "web",
      event_source_id: row.pixelCode,
      data: [toTiktokEvent({ ...payload, ...context })],
      ...(row.testEventCode ? { test_event_code: row.testEventCode } : {}),
    };
    results.push({
      platform: "tiktok",
      pixelCode: row.pixelCode,
      ...(await postJson("https://business-api.tiktok.com/open_api/v1.3/event/track/", body, {
        "Access-Token": row.accessToken,
      })),
    });
  }
  return results;
};

const getPublicConfig = async () => {
  const [metaPixels, tiktokPixels, googleAds] = await Promise.all([
    FacebookPixelService.getPublicFromDB(),
    TiktokPixelService.getPublicFromDB(),
    GoogleAdsService.getPublicFromDB(),
  ]);
  return { metaPixels, tiktokPixels, googleAds };
};

const trackEvent = async (payload, req) => {
  const eventName = String(payload.eventName || "").trim();
  if (!eventName) throw new ApiError(400, "eventName is required");
  const eventId = payload.eventId || `${eventName}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
  const context = {
    ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
    userAgent: req.headers["user-agent"],
  };
  const basePayload = { ...payload, eventName, eventId };
  const [meta, tiktok] = await Promise.all([
    sendMeta(basePayload, context).catch((error) => [{ platform: "meta", ok: false, error: error.message }]),
    sendTiktok(basePayload, context).catch((error) => [{ platform: "tiktok", ok: false, error: error.message }]),
  ]);
  return { eventId, results: [...meta, ...tiktok] };
};

module.exports = { getPublicConfig, trackEvent };
