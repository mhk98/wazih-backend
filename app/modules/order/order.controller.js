const catchAsync = require("../../../shared/catchAsync");
const sendResponse = require("../../../shared/sendResponse");
const pick = require("../../../shared/pick");
const OrderService = require("./order.service");

const resolveIpAddress = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const rawIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || "").split(",")[0];
  return (rawIp || req.ip || req.socket?.remoteAddress || "")
    .replace(/^::ffff:/, "")
    .trim() || null;
};

const createOrder = catchAsync(async (req, res) => {
  const result = await OrderService.createOrderInDB({
    ...req.body,
    ipAddress: req.body.ipAddress || resolveIpAddress(req),
  });
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Order created successfully",
    data: result,
  });
});

const getOrders = catchAsync(async (req, res) => {
  const filters = pick(req.query, ["status", "search", "fromDate", "toDate"]);
  const paginationOptions = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await OrderService.getOrdersFromDB(filters, paginationOptions);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getOrderStatusCounts = catchAsync(async (req, res) => {
  const result = await OrderService.getOrderStatusCountsFromDB();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order status counts fetched successfully",
    data: result,
  });
});

const getOrderById = catchAsync(async (req, res) => {
  const result = await OrderService.getOrderByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order fetched successfully",
    data: result,
  });
});

const trackOrdersByPhone = catchAsync(async (req, res) => {
  const result = await OrderService.trackOrdersByPhoneFromDB(req.query.phone, req.query.invoiceId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders tracked successfully",
    data: result,
  });
});

const updateOrder = catchAsync(async (req, res) => {
  const result = await OrderService.updateOrderInDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order updated successfully",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req, res) => {
  const result = await OrderService.updateOrderStatusInDB(req.params.id, req.body.status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order status updated successfully",
    data: result,
  });
});

const deleteOrder = catchAsync(async (req, res) => {
  const result = await OrderService.deleteOrderFromDB(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

const OrderController = {
  createOrder,
  getOrders,
  getOrderStatusCounts,
  getOrderById,
  trackOrdersByPhone,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
};

module.exports = OrderController;
