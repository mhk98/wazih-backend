const db = require("../../../models");
const ApiError = require("../../../error/ApiError");

const load = async (type) => {
  const row = await db.siteSetting.findOne({ where: { settingType: type } });
  return row?.data || {};
};
const request = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text.slice(0, 300); }
    if (!response.ok) throw new ApiError(400, `Provider rejected credentials (${response.status})`);
    return data;
  } finally { clearTimeout(timer); }
};
const required = (config, fields) => {
  const missing = fields.filter((field) => !String(config?.[field] || "").trim());
  if (missing.length) throw new ApiError(400, `Missing credential(s): ${missing.join(", ")}`);
};

const testCourier = async (provider) => {
  const config = (await load("courier_api"))[provider];
  if (!config) throw new ApiError(404, "Courier configuration not found");
  if (provider === "steadfast") {
    required(config, ["apiKey", "secretKey"]);
    const url = new URL(config.url || "https://portal.packzy.com/api/v1/create_order");
    url.pathname = "/api/v1/get_balance";
    await request(url, { headers: { "Api-Key": config.apiKey, "Secret-Key": config.secretKey, Accept: "application/json" } });
  } else {
    required(config, ["apiKey", "url"]);
    const url = new URL(config.url); url.pathname = "/aladdin/api/v1/stores";
    await request(url, { headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" } });
  }
  return { provider, connected: true };
};

const testPayment = async (provider) => {
  const config = (await load("payment_gateway"))[provider];
  if (!config) throw new ApiError(404, "Gateway configuration not found");
  if (provider === "shurjopay") {
    required(config, ["userName", "password", "baseUrl"]);
    await request(`${config.baseUrl.replace(/\/$/, "")}/get_token`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ username: config.userName, password: config.password }) });
  } else {
    required(config, ["userName", "password", "appKey", "appSecret", "baseUrl"]);
    await request(`${config.baseUrl.replace(/\/$/, "")}/tokenized/checkout/token/grant`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", username: config.userName, password: config.password }, body: JSON.stringify({ app_key: config.appKey, app_secret: config.appSecret }) });
  }
  return { provider, connected: true };
};

const testConfiguration = async (type, provider) => {
  if (type === "courier") return testCourier(provider);
  if (type === "payment") return testPayment(provider);
  const config = await load(type === "sms" ? "sms_gateway" : "fraud_checker");
  if (!config || !Object.keys(config).length) throw new ApiError(400, "Configuration is empty");
  if (type === "sms") required(config, ["url", "apiKey", "senderId"]);
  return { provider: provider || type, configured: true, note: "Credentials saved; live request requires a test recipient/order." };
};
module.exports = { testConfiguration };
