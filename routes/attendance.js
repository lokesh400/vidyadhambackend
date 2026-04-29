const express = require('express');
const asyncHandler = require('express-async-handler');
const Attendance = require('../models/Attendance.js');
const User = require('../models/User.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();
router.use(protect);

// POST /api/attendance
// body: { date: 'YYYY-MM-DD', present: { studentId1: true, studentId2: false }, punchIn: { studentId1: "09:00" }, punchOut: { studentId1: "17:30" } }
router.post('/', asyncHandler(async (req, res) => {
  const { date, present, punchIn, punchOut } = req.body;
  if (!date || !present) {
    res.status(400); throw new Error('date and present required');
  }
  let record = await Attendance.findOne({ date });
  if (record) {
    record.present = present;
    record.punchIn = punchIn || record.punchIn;
    record.punchOut = punchOut || record.punchOut;
    record.takenBy = req.user._id;
    await record.save();
    return res.json(record);
  }
  record = await Attendance.create({ date, present, punchIn, punchOut, takenBy: req.user._id });
  res.status(201).json(record);
}));

// GET /api/attendance/:date
router.get('/:date', asyncHandler(async (req, res) => {
  const record = await Attendance.findOne({ date: req.params.date });
  if (!record) { return res.status(404).json({ message: 'Not found' }); }
  res.json(record);
}));

// 🎯 GENERATE SAMPLE ATTENDANCE FOR MARCH 2026
// POST /api/attendance/generate/march
// Creates attendance records for all days in March with all students marked present
router.post('/generate/march', asyncHandler(async (req, res) => {
  try {
    // Get all students
    const students = await User.find({ role: 'student' });
    
    if (students.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No students found' 
      });
    }

    // Create a map of studentId: true (all present)
    const createPresentMap = () => {
      const map = new Map();
      students.forEach(student => {
        map.set(student._id.toString(), true); // All marked as present
      });
      return Object.fromEntries(map);
    };

    // Create punchIn/punchOut times (random between 8:45-9:15 for in, 17:00-17:45 for out)
    const createTimeMap = (earlyTime, lateTime) => {
      const map = new Map();
      students.forEach(student => {
        map.set(student._id.toString(), earlyTime + ":00");
      });
      return Object.fromEntries(map);
    };

    // Generate attendance for all days in March 2026
    const marchAttendance = [];
    const year = 2026;
    const month = 3; // March (1-indexed)
    const daysInMarch = 31; // March has 31 days

    for (let day = 1; day <= daysInMarch; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Check if attendance already exists for this date
      let existingRecord = await Attendance.findOne({ date });
      
      if (!existingRecord) {
        const attendanceRecord = new Attendance({
          date,
          present: createPresentMap(),
          punchIn: createTimeMap("09"),
          punchOut: createTimeMap("17:30"),
          takenBy: req.user._id
        });
        
        await attendanceRecord.save();
        marchAttendance.push(attendanceRecord);
      }
    }

    res.json({
      success: true,
      message: `✅ Generated sample attendance for March 2026 with ${students.length} students`,
      recordsCreated: marchAttendance.length,
      totalDays: daysInMarch,
      students: students.length,
      note: 'All students are marked as present. You can update individual records as needed.'
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Error generating attendance', 
      error: err.message 
    });
  }
}));

module.exports = router;
