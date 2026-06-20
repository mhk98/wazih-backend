const { Op } = require("sequelize");
const paginationHelpers = require("../../../helpers/paginationHelper");
const db = require("../../../models");
const Brand = db.brand;

const insertIntoDB = async (data) => {
  return await Brand.create(data);
};

const getAllFromDB = async (filters, options) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;
  const andConditions = [];

  if (searchTerm) {
    andConditions.push({ name: { [Op.like]: `%${searchTerm}%` } });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      [Op.and]: Object.entries(filterData).map(([key, value]) => ({
        [key]: { [Op.eq]: value },
      })),
    });
  }

  const whereConditions = andConditions.length ? { [Op.and]: andConditions } : {};

  const result = await Brand.findAll({
    where: whereConditions,
    offset: skip,
    limit,
    paranoid: true,
    order: options.sortBy && options.sortOrder
      ? [[options.sortBy, options.sortOrder.toUpperCase()]]
      : [["createdAt", "DESC"]],
  });

  const count = await Brand.count({ where: whereConditions });

  return { meta: { count, page, limit }, data: result };
};

const getAllFromDBWithoutQuery = async () => {
  return await Brand.findAll({ paranoid: true, order: [["createdAt", "DESC"]] });
};

const getPublicBrands = async () => {
  const rows = await Brand.findAll({
    where: { status: "Active" },
    paranoid: true,
    order: [["createdAt", "DESC"]],
  });

  return rows
    .filter((brand) => brand.logo)
    .map((brand) => ({
      Id: brand.Id,
      name: brand.name,
      file: brand.logo,
      linkUrl: null,
      sortOrder: brand.Id,
    }));
};

const getDataById = async (id) => {
  return await Brand.findOne({ where: { Id: id } });
};

const updateOneFromDB = async (id, payload) => {
  return await Brand.update(payload, { where: { Id: id } });
};

const deleteIdFromDB = async (id) => {
  return await Brand.destroy({ where: { Id: id } });
};

const BrandService = {
  insertIntoDB, getAllFromDB, getAllFromDBWithoutQuery, getPublicBrands, getDataById, updateOneFromDB, deleteIdFromDB,
};

module.exports = BrandService;
