const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  present: { type: Map, of: Boolean }, // key: studentId, value: boolean
  punchIn: { type: Map, of: String }, // key: studentId, value: time (HH:MM)
  punchOut: { type: Map, of: String }, // key: studentId, value: time (HH:MM)
  takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
