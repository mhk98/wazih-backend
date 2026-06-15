const { Op } = require("sequelize");
const paginationHelpers = require("../../../helpers/paginationHelper");
const db = require("../../../models");
const ApiError = require("../../../error/ApiError");

const LandingPage = () => db.landingPage;
const Product = () => db.product;

const normalizePayload = async (payload = {}) => {
  const productId = payload.productId ? Number(payload.productId) : null;
  let product = payload.product || null;

  if (productId && Product()) {
    const productRow = await Product().findOne({ where: { Id: productId } });
    product = productRow?.name || product;
  }

  return {
    productId,
    product,
    title: payload.title || payload.campaignTitle || product || "Untitled Campaign",
    subTitle: payload.subTitle || null,
    bannerImageUrl: payload.bannerImageUrl || null,
    prizeImageUrl: payload.prizeImageUrl || null,
    reviewImages: payload.reviewImages
      ? (typeof payload.reviewImages === "string" ? payload.reviewImages : JSON.stringify(payload.reviewImages))
      : null,
    shortDescription: payload.shortDescription || null,
    video: payload.video || null,
    reviewTitle: payload.reviewTitle || null,
    descriptionTitle: payload.descriptionTitle || null,
    description: payload.description || null,
    whyChooseTitle: payload.whyChooseTitle || null,
    whyChooseUs: payload.whyChooseUs || null,
    price: payload.price === undefined || payload.price === "" ? null : Number(payload.price),
    originalPrice: payload.originalPrice === undefined || payload.originalPrice === "" ? null : Number(payload.originalPrice),
    phone: payload.phone || null,
    template: payload.template || payload.campaignTemplate || "Template Design 1",
    countdown: payload.countdown || payload.countdownTime || null,
    status: payload.status === undefined ? true : Boolean(payload.status),
  };
};

const insertIntoDB = async (payload) => LandingPage().create(await normalizePayload(payload));

const getAllFromDB = async (filters, options) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm } = filters || {};
  const where = searchTerm
    ? {
      [Op.or]: [
        { title: { [Op.like]: `%${searchTerm}%` } },
        { product: { [Op.like]: `%${searchTerm}%` } },
        { template: { [Op.like]: `%${searchTerm}%` } },
      ],
    }
    : {};

  const [data, count] = await Promise.all([
    LandingPage().findAll({ where, offset: skip, limit, order: [["createdAt", "DESC"]], paranoid: true }),
    LandingPage().count({ where }),
  ]);

  return { meta: { count, page, limit }, data };
};

const getOneFromDB = async (id) => {
  const row = await LandingPage().findOne({ where: { Id: id }, paranoid: true });
  if (!row) throw new ApiError(404, "Landing page not found");
  return row;
};

const updateOneFromDB = async (id, payload) => {
  const row = await LandingPage().findOne({ where: { Id: id } });
  if (!row) throw new ApiError(404, "Landing page not found");
  const existing = row.get({ plain: true });
  await row.update(await normalizePayload({ ...existing, ...payload }));
  return row;
};

const deleteIdFromDB = async (id) => {
  const row = await LandingPage().findOne({ where: { Id: id } });
  if (!row) throw new ApiError(404, "Landing page not found");
  await row.destroy();
  return { deleted: true };
};

module.exports = { insertIntoDB, getAllFromDB, getOneFromDB, updateOneFromDB, deleteIdFromDB };
