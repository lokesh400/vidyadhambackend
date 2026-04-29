const express = require("express");
const NoticeBoard = require("../models/NoticeBoard.js");
const Batch = require("../models/Batch.js");
const { isLoggedIn, requireRole } = require("../middleware/auth.js");

const router = express.Router();

function requireApiAuth(req, res, next) {
  if (!req.isAuthenticated() || !req.user || req.user.isActive !== true) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
}

function getBatchLabel(batch) {
  if (!batch) {
    return "Unknown Batch";
  }

  return `${batch.name} ${batch.courseType || ""} ${batch.year || ""}`.trim();
}

function getUserBatchId(user) {
  return user?.batch?._id || user?.batch || null;
}

router.post("/create", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const { title, message, batchId } = req.body;

    if (!title || !message || !batchId) {
      req.flash("error", "Title, message and batch are required.");
      return res.redirect("/noticeboard");
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      req.flash("error", "Batch not found.");
      return res.redirect("/noticeboard");
    }

    await NoticeBoard.create({
      title: title.trim(),
      message: message.trim(),
      batch: batchId,
      createdBy: req.user._id,
    });

    req.flash("success", "Notice created successfully.");
    res.redirect("/noticeboard");
  } catch (error) {
    console.error(error);
    req.flash("error", "Could not create notice.");
    res.redirect("/noticeboard");
  }
});

router.post(
  "/delete/:id",
  isLoggedIn,
  requireRole("admin"),
  async (req, res) => {
    try {
      await NoticeBoard.findByIdAndDelete(req.params.id);
      req.flash("success", "Notice deleted successfully.");
      res.redirect("/noticeboard");
    } catch (error) {
      console.error(error);
      req.flash("error", "Could not delete notice.");
      res.redirect("/noticeboard");
    }
  }
);

router.get("/mine", requireApiAuth, async (req, res) => {
  try {
    const batchId = getUserBatchId(req.user);

    if (!batchId) {
      return res.json({ success: true, notices: [], batch: null });
    }

    const notices = await NoticeBoard.find({
      batch: batchId,
      isActive: true,
    })
      .populate("batch", "name courseType year")
      .populate("createdBy", "name username role")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      batch: batchId,
      notices: notices.map((notice) => ({
        ...notice,
        batchLabel: getBatchLabel(notice.batch),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching notices" });
  }
});

router.get("/batch/:batchId", requireApiAuth, async (req, res) => {
  try {
    const userBatchId = getUserBatchId(req.user);
    const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";

    if (!isAdmin && String(userBatchId) !== String(req.params.batchId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const notices = await NoticeBoard.find({
      batch: req.params.batchId,
      isActive: true,
    })
      .populate("batch", "name courseType year")
      .populate("createdBy", "name username role")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      batchId: req.params.batchId,
      notices: notices.map((notice) => ({
        ...notice,
        batchLabel: getBatchLabel(notice.batch),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching notices" });
  }
});

module.exports = router;