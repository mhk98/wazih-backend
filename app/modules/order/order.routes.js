const express = require("express");
const { ENUM_USER_ROLE } = require("../../enums/user");
const auth = require("../../middlewares/auth");
const OrderController = require("./order.controller");

const router = express.Router();

// Public — customers place orders from the website without login
router.post("/", OrderController.createOrder);
router.post("/create", OrderController.createOrder);
router.get("/track", OrderController.trackOrdersByPhone);

// Admin panel — require authentication
router.get("/status-counts", auth(), OrderController.getOrderStatusCounts);
router.get("/", auth(), OrderController.getOrders);
router.get("/:id", auth(), OrderController.getOrderById);
router.put(
  "/:id/status",
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.CS,
    ENUM_USER_ROLE.LOGISTICS,
  ),
  OrderController.updateOrderStatus,
);
router.put(
  "/:id",
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.CS,
    ENUM_USER_ROLE.LOGISTICS,
  ),
  OrderController.updateOrder,
);
router.delete(
  "/:id",
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN),
  OrderController.deleteOrder,
);

const OrderRoutes = router;
module.exports = OrderRoutes;
