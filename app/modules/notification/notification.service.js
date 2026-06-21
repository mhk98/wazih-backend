const { Op } = require("sequelize");
const db = require("../../../models");
const ApiError = require("../../../error/ApiError");
const paginationHelpers = require("../../../helpers/paginationHelper");
const { emitToUser } = require("../../realtime/socket");

const Notification = () => db.notification;

const getMine = async (userId, filters = {}, options = {}) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const where = { userId };
  if (filters.unreadOnly === true || filters.unreadOnly === "true") where.isRead = false;
  const { count, rows } = await Notification().findAndCountAll({
    where,
    limit,
    offset: skip,
    order: [["createdAt", "DESC"]],
  });
  return { meta: { page, limit, count }, data: rows };
};

const getUnreadCount = async (userId) => Notification().count({ where: { userId, isRead: false } });

const markAsRead = async (userId, id) => {
  const row = await Notification().findOne({ where: { Id: id, userId } });
  if (!row) throw new ApiError(404, "Notification not found");
  if (!row.isRead) await row.update({ isRead: true, readAt: new Date() });
  const unreadCount = await getUnreadCount(userId);
  emitToUser(userId, "notification:read", { id: row.Id, unreadCount });
  return row;
};

const markAllAsRead = async (userId) => {
  const [updated] = await Notification().update(
    { isRead: true, readAt: new Date() },
    { where: { userId, isRead: false } },
  );
  emitToUser(userId, "notification:read-all", { unreadCount: 0 });
  return { updated };
};

const removeMine = async (userId, id) => {
  const row = await Notification().findOne({ where: { Id: id, userId } });
  if (!row) throw new ApiError(404, "Notification not found");
  await row.destroy();
  const unreadCount = await getUnreadCount(userId);
  emitToUser(userId, "notification:deleted", { id: row.Id, unreadCount });
  return { deleted: true };
};

const createForUsers = async (userIds = [], payload = {}, options = {}) => {
  const ids = [...new Set(userIds.map(Number).filter(Boolean))];
  if (!ids.length) return [];
  return Promise.all(ids.map((userId) => Notification().create({
    userId,
    title: String(payload.title || "Notification").trim(),
    message: String(payload.message || "").trim(),
    type: String(payload.type || "general").trim(),
    priority: String(payload.priority || "normal").trim(),
    url: payload.url || null,
    data: payload.data || null,
  }, options)));
};

const createForRoles = async (roles = [], payload = {}, options = {}) => {
  const normalizedRoles = roles.map((role) => String(role).trim()).filter(Boolean);
  if (!normalizedRoles.length) return [];
  const where = { role: { [Op.in]: normalizedRoles }, status: "Active" };
  if (payload.excludeUserId) where.Id = { [Op.ne]: Number(payload.excludeUserId) };
  const users = await db.user.findAll({ attributes: ["Id"], where, transaction: options.transaction });
  return createForUsers(users.map((user) => user.Id), payload, options);
};

module.exports = {
  getMine,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  removeMine,
  createForUsers,
  createForRoles,
};
