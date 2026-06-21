const router = require("express").Router();
const auth = require("../../middlewares/auth");
const C = require("./integration.controller");
router.post("/:type/test", auth(), C.test);
module.exports = router;
