const express = require("express");
const {
  protect,
} = require("../middleware/authMiddleware");
const {
  getProfileAnalytics,
  getDashboardAnalytics,
  getModelStatus,
} = require("../controllers/analyticsController");

const router = express.Router();

router.get(
  "/profile",
  protect,
  getProfileAnalytics
);

router.get(
  "/dashboard",
  protect,
  getDashboardAnalytics
);

router.get(
  "/model-status",
  protect,
  getModelStatus
);

module.exports = router;
