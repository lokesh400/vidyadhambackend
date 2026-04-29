const express = require("express");
const Timetable = require("../../models/Timetable");
const User = require("../../models/User");
const router = express.Router();

router.get("/timetable/mine", async (req, res) => {
  console.log("request received");
  try {
    // find student and get batch
    const student = await User.findById(req.user.id);
    if (!student || !student.batch) {
      return res.status(404).json({ message: "Batch not found for this student" });
    }
    const timetable = await Timetable.findOne({ batch: student.batch });
    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Filter out days marked as "off"
    const activeDays = timetable.timetable.filter(day => !day.isOff);
    console.log(activeDays);

    res.json({ 
      success: true,
      timetable: activeDays,
      totalDays: activeDays.length 
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
