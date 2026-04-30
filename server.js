require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const flash = require("connect-flash");
const axios = require("axios");
const QRCode = require("qrcode");

/* ---------------- CORE ---------------- */
const connectDB = require("./config/db");
const User = require("./models/User");
const Batch = require("./models/Batch");
const NoticeBoard = require("./models/NoticeBoard");
const { isLoggedIn, requireRole } = require("./middleware/auth");

/* ---------------- ROUTES ---------------- */
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const attendanceRoutes = require("./routes/attendance");
const timetableRoutes = require("./routes/timetable");
const formRouter = require("./routes/form");
const admitcardRouter = require("./routes/admitCard");
const marksRouter = require("./routes/testmarks");
const batchRoutes = require("./routes/batch");
const noticeboardRoutes = require("./routes/noticeboard");
const feeRouter = require("./routes/fee");
const webAuthRoutes = require("./routes/webauthroutes");
const queryRoutes = require("./routes/query");
const dataRoutes = require("./routes/data");
const userEditRoutes = require("./routes/userEdit");
const resetPasswordRoute = require("./routes/password");

const recruitmentsRoutes = require("./routes/recruitments");
const recruitmentPublicRoutes = require("./routes/recruitmentPublic");
const staffRoutes = require("./routes/staff");

const mobileAuthRoutes = require("./routes/mobile/auth");
const mobileFeeRoutes = require("./routes/mobile/fee");
const mobileTimetableRoutes = require("./routes/mobile/timetable");
const mobileMarksRoutes = require("./routes/mobile/marks");
const mobileAdminBatchRoutes = require("./routes/mobile/admin/batch");
const mobileAdminQueryRoutes = require("./routes/mobile/admin/query");
const mobileAdminFormRoutes = require("./routes/mobile/admin/form");
const mobileAdminFeeRoutes = require("./routes/mobile/admin/fee");
const studioBookingRoutes = require("./routes/mobile/studioBooking");

/* ---------------- APP INIT ---------------- */
const app = express();
const server = http.createServer(app);
// Kept for future socket integrations.
const io = new Server(server);
void io;

const PORT = process.env.PORT || 5000;

/* ---------------- BASIC MIDDLEWARE ---------------- */
app.use(
  cors({
    origin: [
      "http://localhost:8081",
      "http://localhost:3000",
      "http://192.168.1.0/24", // Local network for mobile testing
      process.env.CLIENT_URL || "http://localhost:8081",
      "https://vidyadhambackend.onrender.com",
      "https://management.vidyadhambook.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ---------------- VIEW ENGINE ---------------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/admin");

/* ---------------- SESSION ---------------- */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "njjhjhjhjghjghjgh",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 60 * 60 * 24 * 7, // 7 days
      touchAfter: 60 * 60, // Lazy session update
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true, // Prevents JS access, more secure
      // secure: true, // HTTPS only in production
      sameSite: "lax", // Works better with mobile and cookies
      path: "/", // Ensure cookie is sent for all paths
    },
    name: "sessionId", // Custom session ID name
  })
);

/* ---------------- PASSPORT ---------------- */
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(flash());

app.use((req, res, next) => {
  res.locals.currUser = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

/* ---------------- SOCKET.IO ---------------- */
// initSocket(io);

/* ---------------- API ROUTES ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/batches", batchRoutes);
app.use("/fees", feeRouter);
app.use("/forms", formRouter);
app.use("/admitcard", admitcardRouter);
app.use("/marks", marksRouter);
app.use("/", webAuthRoutes);
app.use("/", queryRoutes);
app.use("/", dataRoutes);
app.use("/", userEditRoutes);
app.use(resetPasswordRoute);

/* ---------------- MOBILE ROUTES ---------------- */
app.use("/api/m/auth", mobileAuthRoutes);
app.use("/api/fees", mobileFeeRoutes);
app.use("/api/timetable", mobileTimetableRoutes);
app.use("/api/marks", mobileMarksRoutes);
app.use("/api/noticeboard", noticeboardRoutes);

app.use("/api/batch/admin", mobileAdminBatchRoutes);
app.use("/api/query/admin", mobileAdminQueryRoutes);
app.use("/api/form/admin", mobileAdminFormRoutes);
app.use("/api/fee/admin", mobileAdminFeeRoutes);

///////mobile reset password///////
app.use("/api", require("./routes/mobile/password"));

/* ---------------- PAGES ---------------- */
app.get("/", (req, res) => res.redirect("/admin"));

app.get("/data-deletion-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "data-deletion-policy.html"));
});

app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
});

app.get("/admin", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const users = await User.find({ role: "student" });
  const batch = await Batch.find();
  res.render("admin", {
    title: "Dashboard",
    pageTitle: "Dashboard",
    activePage: "dashboard",
    students: users.length,
    batches: batch.length,
  });
});

app.get("/admin/staff-management", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  res.render("admin/staffIndex", {
    title: "Staff Management",
    pageTitle: "Staff Management",
    activePage: "staffManagement",
  });
});

app.get("/noticeboard", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const [batches, notices] = await Promise.all([
      Batch.find().sort({ name: 1, year: 1 }),
      NoticeBoard.find()
        .populate("batch", "name courseType year")
        .populate("createdBy", "name username role")
        .sort({ createdAt: -1 }),
    ]);

    res.render("noticeboard/index", {
      batches,
      notices,
      title: "NoticeBoard",
      pageTitle: "NoticeBoard",
      activePage: "noticeboard",
      messages: req.flash(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading noticeboard");
  }
});

app.use("/admin/recruitments", recruitmentsRoutes);
app.use("/recruitments", recruitmentPublicRoutes);
app.use("/admin/staff", staffRoutes);


app.get("/api/me", async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate("batch");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});


app.get("/attendance/get/students/all", async (req, res) => {
  
  try {
    const students = await User.find({ role: "student" }).populate("batch");
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

app.get("/api/attendance", async (req, res) => {
  try {
    console.log(req.query);
    const { month, year } = req.query;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!month || !year) {
      return res.status(400).json({ message: "month and year are required" });
    }

    const userid = req.user.id;

    // 📌 STATIC SAMPLE DATA FOR APRIL 2026
    if (parseInt(month) === 4 && parseInt(year) === 2026) {
      const attendance = {
        month: 4,
        year: 2026,
        monthName: "April",
        totalDays: 30,
        summary: {
          presentDays: 28,
          absentDays: 2,
          attendancePercentage: 93.33
        },
        dailyData: [
          // Sample data for all days of April
          { date: "2026-04-01", day: "Wednesday", present: true, punchIn: "09:00", punchOut: "17:30" },
          { date: "2026-04-02", day: "Thursday", present: true, punchIn: "09:05", punchOut: "17:25" },
          { date: "2026-04-03", day: "Friday", present: false, punchIn: null, punchOut: null },
          { date: "2026-04-04", day: "Saturday", present: true, punchIn: "09:15", punchOut: "17:45" },
          { date: "2026-04-05", day: "Sunday", present: false, punchIn: null, punchOut: null },
          { date: "2026-04-06", day: "Monday", present: true, punchIn: "09:00", punchOut: "17:30" },
          { date: "2026-04-07", day: "Tuesday", present: true, punchIn: "09:10", punchOut: "17:35" },
          { date: "2026-04-08", day: "Wednesday", present: true, punchIn: "08:55", punchOut: "17:28" },
          { date: "2026-04-09", day: "Thursday", present: true, punchIn: "09:05", punchOut: "17:32" },
          { date: "2026-04-10", day: "Friday", present: false, punchIn: null, punchOut: null },
          { date: "2026-04-11", day: "Saturday", present: true, punchIn: "09:00", punchOut: "17:30" },
          { date: "2026-04-12", day: "Sunday", present: false, punchIn: null, punchOut: null },
          { date: "2026-04-13", day: "Monday", present: true, punchIn: "09:02", punchOut: "17:31" },
          { date: "2026-04-14", day: "Tuesday", present: true, punchIn: "09:00", punchOut: "17:30" },
          { date: "2026-04-15", day: "Wednesday", present: true, punchIn: "09:08", punchOut: "17:29" },
          { date: "2026-04-16", day: "Thursday", present: true, punchIn: "09:03", punchOut: "17:33" },
          { date: "2026-04-17", day: "Friday", present: true, punchIn: "09:01", punchOut: "17:30" },
          { date: "2026-04-18", day: "Saturday", present: true, punchIn: "09:00", punchOut: "17:30" },
          { date: "2026-04-19", day: "Sunday", present: false, punchIn: null, punchOut: null },
          { date: "2026-04-20", day: "Monday", present: true, punchIn: "09:04", punchOut: "17:32" },
          { date: "2026-04-21", day: "Tuesday", present: true, punchIn: "09:00", punchOut: "17:30" },
          { date: "2026-04-22", day: "Wednesday", present: true, punchIn: "09:06", punchOut: "17:28" },
          { date: "2026-04-23", day: "Thursday", present: true, punchIn: "09:02", punchOut: "17:31" },
          { date: "2026-04-24", day: "Friday", present: true, punchIn: "09:00", punchOut: "17:30" },
          { date: "2026-04-25", day: "Saturday", present: true, punchIn: "09:05", punchOut: "17:29" },
          { date: "2026-04-26", day: "Sunday", present: false, punchIn: null, punchOut: null },
          { date: "2026-04-27", day: "Monday", present: true, punchIn: "09:00", punchOut: "17:30" },
          { date: "2026-04-28", day: "Tuesday", present: true, punchIn: "09:03", punchOut: "17:32" },
          { date: "2026-04-29", day: "Wednesday", present: true, punchIn: "09:00", punchOut: "17:30" },
          { date: "2026-04-30", day: "Thursday", present: true, punchIn: "09:07", punchOut: "17:27" }
        ],
        note: "📌 This is sample/hardcoded data for April 2026. Shows date, present status, punch-in and punch-out times."
      };

      return res.json(attendance);
    }

    // For other months, query from database
    try {
      const Attendance = require('./models/Attendance.js');
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const attendanceRecords = await Attendance.find({
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      if (attendanceRecords.length === 0) {
        return res.json({
          month: parseInt(month),
          year: parseInt(year),
          message: "No attendance records found for this month",
          records: []
        });
      }

      res.json({
        month: parseInt(month),
        year: parseInt(year),
        totalRecords: attendanceRecords.length,
        records: attendanceRecords
      });
    } catch (dbErr) {
      console.error("Database error:", dbErr);
      res.json({
        month: parseInt(month),
        year: parseInt(year),
        error: "Database error",
        message: "Could not fetch attendance records"
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", err });
  }
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ---------------- ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

/* ---------------- SERVER START ---------------- */
function startKeepAlive() {
  const url = "https://vidyadhambackend.onrender.com";
  if (!url) {
    console.warn("⚠️ RENDER_EXTERNAL_URL not set, keep-alive disabled");
    return;
  }

  const isHttps = url.startsWith("https");
  const client = isHttps ? https : http;
  const pingUrl = `${url}/health`;

  setInterval(() => {
    const req = client.get(pingUrl, (res) => {
      console.log(`🔄 Keep-alive ping → ${res.statusCode}`);
      res.resume();
    });

    req.on("error", (err) => {
      console.error("❌ Keep-alive error:", err.message);
    });

    req.setTimeout(5000, () => {
      console.warn("⏱️ Keep-alive timeout");
      req.destroy();
    });
  }, 10000);
}

async function startServer() {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    startKeepAlive();
  });
}

startServer();