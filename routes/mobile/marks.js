const express = require("express");
const Marks = require("../../models/Marks");
const User = require("../../models/User");
const router = express.Router();

/**
 * POST /api/marks/all
 * BODY: { studentId }
 * Returns ALL tests of this student
 */
router.get("/all", async (req, res) => {
  try {
    const studentId = req.user.id;;
    console.log("Fetching marks for studentId:", studentId);

    if (!studentId)
      return res.status(400).json({ message: "studentId required" });

    // find student -> get batch + name / rollNo
    const student = await User.findById(studentId);
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    // find all tests of this rollNo OR student name
    const marks = await Marks.find({
      student: student.name, // or student.username
      batch: student.batch,
    }).sort({ testDate: -1 }); // Sort by test date (newest first)

    // Format response with all relevant data
    const formattedMarks = marks.map(mark => ({
      _id: mark._id,
      testTitle: mark.testTitle,
      testDate: mark.testDate, // Test conduct date
      uploadedAt: mark.uploadedAt, // When marks were uploaded
      examType: mark.examType,
      rollNo: mark.rollNo,
      physics: mark.physics,
      physicsTotal: mark.physicsTotal,
      chemistry: mark.chemistry,
      chemistryTotal: mark.chemistryTotal,
      math: mark.math,
      mathTotal: mark.mathTotal,
      botany: mark.botany,
      botanyTotal: mark.botanyTotal,
      zoology: mark.zoology,
      zoologyTotal: mark.zoologyTotal,
    }));

    res.json({ 
      success: true,
      marks: formattedMarks 
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
