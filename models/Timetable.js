const mongoose = require("mongoose");

const periodSchema = new mongoose.Schema({
  subject: { type: String, default: "" },
  teacher: { type: String, default: "" },
  startTime: { type: String, default: "" }, // store in "HH:MM" format
  endTime: { type: String, default: "" },
});

const daySchema = new mongoose.Schema({
  day: { type: String, required: true },
  isOff: { type: Boolean, default: false }, // Mark day as off (no classes)
  periods: [periodSchema],
});

const timetableSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
  timetable: [daySchema], // weekly timetable
  createdAt: { type: Date, default: Date.now },
});

const Timetable=  mongoose.model("Timetable", timetableSchema);
module.exports = Timetable;