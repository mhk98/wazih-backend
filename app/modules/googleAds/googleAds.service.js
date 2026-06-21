const { Op } = require("sequelize");
const paginationHelpers = require("../../../helpers/paginationHelper");
const db = require("../../../models");
const ApiError = require("../../../error/ApiError");
const M = () => db.googleAds;

const normalizePayload = (data = {}) => {
  const conversionId = String(data.conversionId || "").trim().toUpperCase();
  const conversionLabel = String(data.conversionLabel || "").trim();
  if (!/^AW-\d+$/.test(conversionId)) throw new ApiError(400, "Google Ads Conversion ID must use AW-123456789 format");
  if (!conversionLabel) throw new ApiError(400, "Google Ads Conversion Label is required");
  return {
    conversionId,
    conversionLabel,
    customerId: String(data.customerId || "").trim() || null,
    status: data.status === false || data.status === "Inactive" ? "Inactive" : "Active",
  };
};

const ensureUnique = async (conversionId, conversionLabel, excludeId) => {
  const where = { conversionId, conversionLabel };
  if (excludeId) where.Id = { [Op.ne]: excludeId };
  if (await M().findOne({ where })) throw new ApiError(409, "This Google Ads conversion already exists");
};

const insertIntoDB = async (data) => {
  const payload = normalizePayload(data);
  await ensureUnique(payload.conversionId, payload.conversionLabel);
  return M().create(payload);
};

const getAllFromDB = async (filters, options) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm } = filters || {};
  const where = searchTerm ? { conversionId: { [Op.like]: `%${searchTerm}%` } } : {};
  const [data, count] = await Promise.all([
    M().findAll({ where, offset: skip, limit, paranoid: true, order: [["createdAt", "DESC"]] }),
    M().count({ where }),
  ]);
  return { meta: { count, page, limit }, data };
};

const getActiveFromDB = async () =>
  M().findAll({ where: { status: "Active" }, paranoid: true, order: [["createdAt", "DESC"]] });

const getPublicFromDB = async () => {
  const rows = await getActiveFromDB();
  return rows.map((row) => {
    const plain = row.toJSON();
    return {
      Id: plain.Id,
      conversionId: plain.conversionId,
      conversionLabel: plain.conversionLabel,
      status: plain.status,
    };
  });
};

const updateOneFromDB = async (id, payload) => {
  const row = await M().findOne({ where: { Id: id } });
  if (!row) throw new ApiError(404, "Google Ads config not found");
  const data = normalizePayload({ ...row.get({ plain: true }), ...payload });
  await ensureUnique(data.conversionId, data.conversionLabel, row.Id);
  await row.update(data);
  return row;
};

const deleteIdFromDB = async (id) => {
  const row = await M().findOne({ where: { Id: id } });
  if (!row) throw new ApiError(404, "Google Ads config not found");
  await row.destroy();
  return { deleted: true };
};

module.exports = { insertIntoDB, getAllFromDB, getActiveFromDB, getPublicFromDB, updateOneFromDB, deleteIdFromDB };
