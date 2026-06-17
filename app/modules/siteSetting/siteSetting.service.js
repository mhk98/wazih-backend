const db = require("../../../models");
const ApiError = require("../../../error/ApiError");

const VALID_TYPES = [
  "general", "social_media", "contact",
  "courier_api", "payment_gateway", "sms_gateway", "fraud_checker",
];

const validateType = (settingType) => {
  const t = String(settingType || "").trim().toLowerCase();
  if (!VALID_TYPES.includes(t)) throw new ApiError(400, `Invalid setting type. Valid: ${VALID_TYPES.join(", ")}`);
  return t;
};

const getByType = async (settingType) => {
  const type = validateType(settingType);
  return db.siteSetting.findOne({ where: { settingType: type } });
};

const isNumericKeyMap = (value) => {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
};

const normalizeSettingData = (value, depth = 0) => {
  if (!value || depth > 5) return {};

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      return normalizeSettingData(JSON.parse(trimmed), depth + 1);
    } catch {
      return {};
    }
  }

  if (isNumericKeyMap(value)) {
    const text = Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key])
      .join("");
    return normalizeSettingData(text, depth + 1);
  }

  if (Array.isArray(value) || typeof value !== "object") return {};
  return value;
};

const getPublic = async () => {
  const [general, socialMedia, contact] = await Promise.all([
    db.siteSetting.findOne({ where: { settingType: "general" } }),
    db.siteSetting.findOne({ where: { settingType: "social_media" } }),
    db.siteSetting.findOne({ where: { settingType: "contact" } }),
  ]);

  const generalData = normalizeSettingData(general?.data);
  const socialMediaData = normalizeSettingData(socialMedia?.data);
  const contactData = normalizeSettingData(contact?.data);
  const whiteLogo = generalData.whiteLogo;
  const darkLogo = generalData.darkLogo;
  const faviconLogo = generalData.faviconLogo;
  const scrollText = generalData.scrollText;

  return {
    name: generalData.name || null,
    logoFile: generalData.logoFile || whiteLogo || darkLogo || null,
    faviconFile: generalData.faviconFile || faviconLogo || null,
    marqueeText: generalData.marqueeText || scrollText || null,
    metaTitle: generalData.metaTitle || null,
    metaKeyword: generalData.metaKeyword || null,
    metaDescription: generalData.metaDescription || null,
    bkashNumber: generalData.bkashNumber || null,
    nagadNumber: generalData.nagadNumber || null,
    rocketNumber: generalData.rocketNumber || null,
    orderBlockLimit: generalData.orderBlockLimit || null,
    blockTime: generalData.blockTime || null,
    timeUnit: generalData.timeUnit || null,
    status: generalData.status ?? true,
    ...socialMediaData,
    ...contactData,
  };
};

const upsert = async (settingType, payload) => {
  const type = validateType(settingType);
  const data = normalizeSettingData(payload?.data ?? payload);
  const [row] = await db.siteSetting.findOrCreate({
    where: { settingType: type },
    defaults: { settingType: type, data },
  });
  if (!row.isNewRecord) await row.update({ data });
  return row;
};

module.exports = { getByType, getPublic, upsert };
