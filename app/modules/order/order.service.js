const { Op, fn, col, literal } = require("sequelize");
const db = require("../../../models");
const ApiError = require("../../../error/ApiError");
const paginationHelpers = require("../../../helpers/paginationHelper");
const { ORDER_STATUS, ORDER_STATUS_VALUES, ORDER_SEARCHABLE_FIELDS } = require("./order.constants");

const Order = db.order;

const generateOrderId = async () => {
  const last = await Order.findOne({
    order: [["Id", "DESC"]],
    paranoid: false,
  });
  const nextNum = last ? last.Id + 1 : 1;
  return `WZ-${String(nextNum).padStart(3, "0")}`;
};

const createOrderInDB = async (payload) => {
  const orderId = await generateOrderId();
  const order = await Order.create({ ...payload, orderId });
  return order;
};

const getOrdersFromDB = async (filters, paginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const { status, search, fromDate, toDate } = filters;

  const where = {};

  if (status && status !== "all" && ORDER_STATUS_VALUES.includes(status)) {
    where.status = status;
  }

  if (search) {
    where[Op.or] = ORDER_SEARCHABLE_FIELDS.map((field) => ({
      [field]: { [Op.like]: `%${search}%` },
    }));
  }

  if (fromDate && toDate) {
    where.orderDate = { [Op.between]: [fromDate, toDate] };
  } else if (fromDate) {
    where.orderDate = { [Op.gte]: fromDate };
  } else if (toDate) {
    where.orderDate = { [Op.lte]: toDate };
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    limit,
    offset: skip,
    order: [[sortBy || "Id", sortOrder || "DESC"]],
  });

  return {
    meta: { page, limit, total: count },
    data: rows,
  };
};

const getOrderStatusCountsFromDB = async () => {
  const counts = await Order.findAll({
    attributes: ["status", [fn("COUNT", col("Id")), "count"]],
    group: ["status"],
    raw: true,
  });

  const total = await Order.count();

  const result = { all: total };
  ORDER_STATUS_VALUES.forEach((s) => (result[s] = 0));
  counts.forEach(({ status, count }) => {
    result[status] = Number(count);
  });

  return result;
};

const getOrderByIdFromDB = async (id) => {
  const order = await Order.findByPk(id);
  if (!order) throw new ApiError(404, "Order not found");
  return order;
};

const updateOrderInDB = async (id, payload) => {
  const order = await Order.findByPk(id);
  if (!order) throw new ApiError(404, "Order not found");
  await order.update(payload);
  return order;
};

const deleteOrderFromDB = async (id) => {
  const order = await Order.findByPk(id);
  if (!order) throw new ApiError(404, "Order not found");
  await order.destroy();
  return { message: "Order deleted successfully" };
};

const updateOrderStatusInDB = async (id, status) => {
  if (!ORDER_STATUS_VALUES.includes(status)) {
    throw new ApiError(400, `Invalid status. Valid: ${ORDER_STATUS_VALUES.join(", ")}`);
  }
  const order = await Order.findByPk(id);
  if (!order) throw new ApiError(404, "Order not found");
  await order.update({ status });
  return order;
};

const OrderService = {
  createOrderInDB,
  getOrdersFromDB,
  getOrderStatusCountsFromDB,
  getOrderByIdFromDB,
  updateOrderInDB,
  deleteOrderFromDB,
  updateOrderStatusInDB,
};

module.exports = OrderService;
