const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../../models/User");
const Otp = require("../../models/Otp");
const crypto = require("crypto");
const Brevo = require("@getbrevo/brevo");

const BREVO_API_KEY = (process.env.BREVO_API_KEY || "").trim();

const transactionalApi = new Brevo.TransactionalEmailsApi();
if (BREVO_API_KEY) {
  transactionalApi.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
}



router.post("/login", (req, res, next) => {
  console.log("BODY:", req.body);

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("ERR:", err);
      return next(err);
    }

    if (!user) {
      console.log("LOGIN FAILED:", info);
      return res.status(401).json({
        loggedIn: false,
        message: info?.message || "Invalid email or password",
      });
    }

    // 🔒 CHECK IF USER IS ACTIVE
    if (user.isActive !== true) {
      console.log("INACTIVE USER ATTEMPT:", user.email);

      return res.status(403).json({
        loggedIn: false,
        message: "Your account is inactive. Please contact the administration.",
      });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      console.log("LOGIN SUCCESS:", user.id);
      return res.json({
        loggedIn: true,
        user: user.email,
        userId: user.id,
        role: user.role,
      });
    });
  })(req, res, next);
});

// router.post("/login", (req, res, next) => {
//   console.log("BODY:", req.body);

//   passport.authenticate("local", (err, user, info) => {
//     if (err) {
//       console.error("ERR:", err);
//       req.flash("error", "Authentication error");
//       return next(err);
//     }
//     if (!user) {
//       console.log("LOGIN FAILED:", info);
//       req.flash("error", info.message);
//       return res.redirect("/login");
//     }

//     req.logIn(user, (err) => {
//       // if (err) return next(err);
//       // if (user.role === "receptionist") {
//       //   req.flash("success", "Login successful");
//       //   return res.redirect("/receptionist");
//       // }
//       // if (user.role === "admin") {
//       //   req.flash("success", "Login successful");
//       //   return res.redirect("/admin/only");
//       // }
//       // if (user.role === "student") {
//       //   req.flash("success", "Please Login to your student portal");
//       //   return res.redirect("/login");
//       // }
//       // console.log("LOGIN SUCCESS:", user.username);
//       // req.flash("success", "Login successful");
//       // return res.redirect("/admin");
//       if(err) return next(err);

//     });
//   })(req, res, next);
// });

router.get("/check", (req, res) => {
  console.log("CHECK SESSION:", req.isAuthenticated());

  if (!req.isAuthenticated()) {
    return res.json({ loggedIn: false });
  }

  // 🔒 ACTIVE CHECK
  if (!req.user || req.user.isActive !== true) {
    req.logout(function (err) {
      if (err) console.error(err);
      return res.json({
        loggedIn: false,
        message: "Account inactive",
      });
    });
    return;
  }

  console.log("USER LOGGED IN:", req.user.id);

  res.json({
    loggedIn: true,
    user: req.user.email,
    userId: req.user.id,
    role: req.user.role,
  });
});



// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.json({ loggedIn: false });
  });
});

module.exports = router;
