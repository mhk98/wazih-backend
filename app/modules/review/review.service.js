const { Op } = require("sequelize");
const paginationHelpers = require("../../../helpers/paginationHelper");
const db = require("../../../models");
const Review = db.review;

const insertIntoDB = async (data) => {
  return await Review.create(data);
};

const getAllFromDB = async (filters, options) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;
  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      [Op.or]: [
        { customerName: { [Op.like]: `%${searchTerm}%` } },
        { productName: { [Op.like]: `%${searchTerm}%` } },
      ],
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      [Op.and]: Object.entries(filterData).map(([key, value]) => ({
        [key]: { [Op.eq]: value },
      })),
    });
  }

  const whereConditions = andConditions.length ? { [Op.and]: andConditions } : {};

  const result = await Review.findAll({
    where: whereConditions,
    offset: skip,
    limit,
    paranoid: true,
    order: options.sortBy && options.sortOrder
      ? [[options.sortBy, options.sortOrder.toUpperCase()]]
      : [["createdAt", "DESC"]],
  });

  const count = await Review.count({ where: whereConditions });

  return { meta: { count, page, limit }, data: result };
};

const getAllFromDBWithoutQuery = async () => {
  return await Review.findAll({ paranoid: true, order: [["createdAt", "DESC"]] });
};

const getDataById = async (id) => {
  return await Review.findOne({ where: { Id: id } });
};

const updateOneFromDB = async (id, payload) => {
  return await Review.update(payload, { where: { Id: id } });
};

const deleteIdFromDB = async (id) => {
  return await Review.destroy({ where: { Id: id } });
};

const ReviewService = {
  insertIntoDB, getAllFromDB, getAllFromDBWithoutQuery, getDataById, updateOneFromDB, deleteIdFromDB,
};

module.exports = ReviewService;
