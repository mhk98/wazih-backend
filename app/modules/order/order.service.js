const { Op, fn, col, literal } = require("sequelize");
const db = require("../../../models");
const ApiError = require("../../../error/ApiError");
const paginationHelpers = require("../../../helpers/paginationHelper");
const { ORDER_STATUS_VALUES, ORDER_SEARCHABLE_FIELDS } = require("./order.constants");
const SiteSettingService = require("../siteSetting/siteSetting.service");
const OrderStatusService = require("../orderStatus/orderStatus.service");
const CouponCodeService = require("../couponCode/couponCode.service");

const Order = db.order;
const IpBlock = db.ipBlock;

const LOOPBACK_IP_VARIANTS = [
  "127.0.0.1",
  "::1",
  "0:0:0:0:0:0:0:1",
  "localhost",
];

const normalizeIpAddress = (value) =>
  String(value || "")
    .trim()
    .replace(/^::ffff:/, "");

const getIpVariants = (value) => {
  const ip = normalizeIpAddress(value);
  if (!ip) return [];
  if (LOOPBACK_IP_VARIANTS.includes(ip)) return LOOPBACK_IP_VARIANTS;
  return [...new Set([ip, String(value || "").trim()].filter(Boolean))];
};

const generateOrderId = async () => {
  const last = await Order.findOne({
    order: [["Id", "DESC"]],
    paranoid: false,
  });
  const nextNum = last ? last.Id + 1 : 1;
  return `WZ-${String(nextNum).padStart(3, "0")}`;
};

const parseOrderMeta = (note) => {
  if (!note || typeof note !== "string") return {};
  try {
    const parsed = JSON.parse(note);
    return parsed && parsed.__frontendOrder ? parsed : {};
  } catch {
    return {};
  }
};

const toPublicOrder = (order) => {
  const plain = typeof order.toJSON === "function" ? order.toJSON() : order;
  const meta = parseOrderMeta(plain.note);
  const items = Array.isArray(meta.items)
    ? meta.items
    : [{
        name: plain.productName,
        image: plain.productImage || undefined,
        qty: plain.quantity || 1,
        price: Number(plain.totalBill || 0),
      }];

  return {
    ...plain,
    invoiceId: plain.orderId,
    customerAddress: meta.customerAddress || [plain.customerArea, plain.customerDistrict].filter(Boolean).join(", "),
    paymentMethod: meta.paymentMethod || "cod",
    paymentStatus: meta.paymentStatus || "pending",
    items,
    subtotal: meta.subtotal ?? Number(plain.totalBill || 0),
    deliveryCharge: meta.deliveryCharge ?? 0,
    total: meta.total ?? Number(plain.totalBill || 0),
  };
};

const unitToMs = (unit) => {
  const normalized = String(unit || "hour").trim().toLowerCase();
  if (normalized.startsWith("min")) return 60 * 1000;
  if (normalized.startsWith("day")) return 24 * 60 * 60 * 1000;
  return 60 * 60 * 1000;
};

const enforceOrderBlockLimit = async ({ customerPhone, ipAddress }) => {
  const settings = await SiteSettingService.getPublic();
  if (settings.status === false) return;

  const limit = Number(settings.orderBlockLimit || 0);
  const blockTime = Number(settings.blockTime || 0);
  if (!limit || !blockTime) return;

  const since = new Date(Date.now() - blockTime * unitToMs(settings.timeUnit));
  const orConditions = [];
  if (customerPhone) orConditions.push({ customerPhone: String(customerPhone).trim() });
  const ipVariants = getIpVariants(ipAddress);
  if (ipVariants.length) orConditions.push({ ipAddress: { [Op.in]: ipVariants } });
  if (!orConditions.length) return;

  const count = await Order.count({
    where: {
      createdAt: { [Op.gte]: since },
      [Op.or]: orConditions,
    },
    paranoid: true,
  });

  if (count >= limit) {
    throw new ApiError(
      429,
      `Order limit reached. Please try again after ${blockTime} ${settings.timeUnit || "Hour"}.`,
    );
  }
};

const calculateItemsSubtotal = (items = []) =>
  items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0,
  );

const applyOrderCoupon = async (payload = {}) => {
  if (!Array.isArray(payload.items)) return payload;

  const itemSubtotal = calculateItemsSubtotal(payload.items);
  const subtotal = itemSubtotal > 0 ? itemSubtotal : Number(payload.subtotal || 0);
  const deliveryCharge = Number(payload.deliveryCharge || 0);
  let discount = 0;
  let couponCode = null;

  if (payload.couponCode) {
    const appliedCoupon = await CouponCodeService.validateCoupon({
      code: payload.couponCode,
      subtotal,
    });
    discount = Number(appliedCoupon.discount || 0);
    couponCode = appliedCoupon.code;
  }

  return {
    ...payload,
    subtotal,
    deliveryCharge,
    discount,
    couponCode,
    total: Math.max(0, subtotal + deliveryCharge - discount),
  };
};

const normalizeCreatePayload = (payload) => {
  if (!Array.isArray(payload.items)) {
    return {
      ...payload,
      orderDate: payload.orderDate || new Date().toISOString().slice(0, 10),
    };
  }

  const items = payload.items;
  const quantity = items.reduce((sum, item) => sum + Number(item.qty || 0), 0) || 1;
  const firstItem = items[0] || {};
  const productName = items.map((item) => `${item.name} x${item.qty || 1}`).join(", ");
  const meta = {
    __frontendOrder: true,
    customerAddress: payload.customerAddress || "",
    paymentMethod: payload.paymentMethod || "cod",
    paymentStatus: payload.paymentMethod && payload.paymentMethod !== "cod" ? "unverified" : "pending",
    items,
    subtotal: Number(payload.subtotal || 0),
    deliveryCharge: Number(payload.deliveryCharge || 0),
    discount: Number(payload.discount || 0),
    couponCode: payload.couponCode || null,
    advance: Number(payload.advance || 0),
    total: Number(payload.total || 0),
  };

  return {
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    ipAddress: payload.ipAddress,
    customerArea: payload.customerAddress || null,
    customerDistrict: payload.customerDistrict || null,
    productName: productName || "Website Order",
    productImage: firstItem.image || null,
    quantity,
    totalBill: Number(payload.total || payload.subtotal || 0),
    advance: Number(payload.advance || 0),
    status: "pending",
    orderDate: new Date().toISOString().slice(0, 10),
    note: JSON.stringify(meta),
  };
};

const createOrderInDB = async (payload) => {
  const ipAddress = normalizeIpAddress(payload.ipAddress);
  if (ipAddress && IpBlock) {
    const blockedIp = await IpBlock.findOne({
      where: { ip: { [Op.in]: getIpVariants(ipAddress) } },
      paranoid: true,
    });
    if (blockedIp) {
      throw new ApiError(403, "Orders from this IP address are blocked");
    }
  }
  await enforceOrderBlockLimit({ customerPhone: payload.customerPhone, ipAddress });
  const orderId = await generateOrderId();
  const checkedPayload = await applyOrderCoupon({ ...payload, ipAddress });
  const order = await Order.create({ ...normalizeCreatePayload(checkedPayload), orderId });
  return toPublicOrder(order);
};

const validateOrderStatus = async (status) => {
  const key = OrderStatusService.toOrderStatusKey(status);
  const activeKeys = await OrderStatusService.getActiveStatusKeys();
  const validKeys = activeKeys.length ? activeKeys : ORDER_STATUS_VALUES;
  if (!validKeys.includes(key)) {
    throw new ApiError(400, `Invalid status. Valid: ${validKeys.join(", ")}`);
  }
  return key;
};

const getOrdersFromDB = async (filters, paginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const { status, search, fromDate, toDate } = filters;

  const where = {};

  if (status && status !== "all") {
    where.status = OrderStatusService.toOrderStatusKey(status);
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
  const activeStatuses = await OrderStatusService.getActiveStatusOptions();
  const counts = await Order.findAll({
    attributes: ["status", [fn("COUNT", col("Id")), "count"]],
    group: ["status"],
    raw: true,
  });

  const total = await Order.count();

  const result = { all: total };
  activeStatuses.forEach((s) => (result[s.key] = 0));
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

const trackOrdersByPhoneFromDB = async (phone, invoiceId) => {
  const normalized = String(phone || "").trim();
  const normalizedInvoice = String(invoiceId || "").trim();
  if (!normalized && !normalizedInvoice) throw new ApiError(400, "Phone number or invoice ID is required");

  const where = normalizedInvoice
    ? { orderId: normalizedInvoice }
    : { customerPhone: { [Op.like]: `%${normalized}%` } };

  const orders = await Order.findAll({
    where,
    limit: 20,
    order: [["Id", "DESC"]],
    paranoid: true,
  });
  return orders.map(toPublicOrder);
};

const updateOrderInDB = async (id, payload) => {
  const order = await Order.findByPk(id);
  if (!order) throw new ApiError(404, "Order not found");
  const next = { ...payload };
  if (next.status !== undefined) {
    next.status = await validateOrderStatus(next.status);
  }
  await order.update(next);
  return order;
};

const deleteOrderFromDB = async (id) => {
  const order = await Order.findByPk(id);
  if (!order) throw new ApiError(404, "Order not found");
  await order.destroy();
  return { message: "Order deleted successfully" };
};

const updateOrderStatusInDB = async (id, status) => {
  const nextStatus = await validateOrderStatus(status);
  const order = await Order.findByPk(id);
  if (!order) throw new ApiError(404, "Order not found");
  await order.update({ status: nextStatus });
  return order;
};

const OrderService = {
  createOrderInDB,
  getOrdersFromDB,
  getOrderStatusCountsFromDB,
  getOrderByIdFromDB,
  trackOrdersByPhoneFromDB,
  updateOrderInDB,
  deleteOrderFromDB,
  updateOrderStatusInDB,
};

module.exports = OrderService;
