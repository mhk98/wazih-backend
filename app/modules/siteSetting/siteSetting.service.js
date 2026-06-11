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

const upsert = async (settingType, payload) => {
  const type = validateType(settingType);
  const data = payload?.data ?? payload;
  const [row] = await db.siteSetting.findOrCreate({
    where: { settingType: type },
    defaults: { settingType: type, data },
  });
  if (!row.isNewRecord) await row.update({ data });
  return row;
};

module.exports = { getByType, upsert };
