const { Op } = require("sequelize");
const paginationHelpers = require("../../../helpers/paginationHelper");
const db = require("../../../models");
const ApiError = require("../../../error/ApiError");
const M = () => db.tiktokPixel;

const insertIntoDB = async (data) => M().create(data);

const getAllFromDB = async (filters, options) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm } = filters || {};
  const where = searchTerm ? { pixelCode: { [Op.like]: `%${searchTerm}%` } } : {};
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
    return { Id: plain.Id, pixelCode: plain.pixelCode, status: plain.status };
  });
};

const updateOneFromDB = async (id, payload) => {
  const row = await M().findOne({ where: { Id: id } });
  if (!row) throw new ApiError(404, "TikTok pixel not found");
  await row.update(payload);
  return row;
};

const deleteIdFromDB = async (id) => {
  const row = await M().findOne({ where: { Id: id } });
  if (!row) throw new ApiError(404, "TikTok pixel not found");
  await row.destroy();
  return { deleted: true };
};

module.exports = { insertIntoDB, getAllFromDB, getActiveFromDB, getPublicFromDB, updateOneFromDB, deleteIdFromDB };
