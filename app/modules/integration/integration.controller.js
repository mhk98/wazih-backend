const catchAsync = require("../../../shared/catchAsync");
const sendResponse = require("../../../shared/sendResponse");
const Service = require("./integration.service");
module.exports = { test: catchAsync(async (req, res) => sendResponse(res, { statusCode: 200, success: true, message: "Integration test successful", data: await Service.testConfiguration(req.params.type, req.body.provider) })) };
