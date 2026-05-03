const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Otp = require("../models/Otp");
const crypto = require("crypto");
const { sendOtp } = require("../utils/mailer");
const Brevo = require('@getbrevo/brevo');

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').trim();

/* ---------------- BREVO SETUP (WORKING) ---------------- */
const brevo = new Brevo.TransactionalEmailsApi();

brevo.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  BREVO_API_KEY
);

const contactApi = new Brevo.ContactsApi();
contactApi.setApiKey(
  Brevo.ContactsApiApiKeys.apiKey,
  BREVO_API_KEY
);
const transactionalApi = new Brevo.TransactionalEmailsApi();
transactionalApi.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  BREVO_API_KEY
);

async function unblockIfBlacklisted(email) {
  try {
    await transactionalApi.deleteTransacBlockedContacts(email);
    console.log(`✅ Successfully unblocked email: ${email}`);
  } catch (e) {
    if (e.response?.status === 404) {
      console.log('ℹ️ Email was not blocked');
    } else {
      console.error(
        '❌ Error unblocking email:',
        e.response?.body || e.message
      );
    }
  }
}

async function sendOtpEmail(email, otp) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.templateId = 1;
  mail.sender = {
    email: process.env.SENDER_EMAIL,
    name: process.env.SENDER_NAME
  };

  mail.params = { otp: otp };
  mail.headers = { 'X-Mailin-transactional': 'true' };

  return brevo.sendTransacEmail(mail);
}

// RESET PAGE
router.get("/user/reset-password", (req, res) => {
  res.render("reset-password", {
    messages: req.flash(),
    title: "Reset Password",
    pageTitle: "Reset Password",
    activePage: "reset-password",
    layout: false,
  });
});

// SINGLE POST ROUTE
router.post("/reset-password", async (req, res) => {
  try {
    const { identifier } = req.body;
    
    const user = await User.findOne({
      $or: [
        { rollNumber: identifier },
        { email: identifier },
        { username: identifier }
      ]
    });

    if (!user) {
      req.flash("error", "No account found with that username, email, or roll number");
      return res.redirect("/user/reset-password");
    }

    const email = user.email;
    if (!email) {
      req.flash("error", "No email associated with this account. Please contact admin.");
      return res.redirect("/user/reset-password");
    }

    // Generate token
    const { sendResetPasswordEmail } = require("../utils/mailer");
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Set token & expiry (1 hour)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    // Create reset URL
    const baseUrl = "https://management.vidyadhambook.com"
    const resetUrl = `${baseUrl}/password/reset/${resetToken}`;

    // Send email
    const emailSent = await sendResetPasswordEmail(email, resetUrl);
    
    if (emailSent) {
      req.flash("success", "A password reset link has been sent to your registered email.");
    } else {
      req.flash("error", "Failed to send reset link. Please try again later.");
    }

    return res.redirect("/login");
  } catch (error) {
    console.error("Error in reset password link route:", error);
    req.flash("error", "An error occurred while processing your request.");
    return res.redirect("/user/reset-password");
  }
});

/////////////////////////////////////////
//Password for VidyaDham Mandir attendance//
/////////////////////////////////////////

router.post("/garud/attendance/reset-password", async (req, res) => {
  try {
    const { to, text } = req.body;
    const email = to;
    const otp = text;
    await sendOtpEmail(email, otp);
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// URL-based Password Reset for Mobile Request & Web Request
router.get("/password/reset/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/user/login"); // Or anywhere suitable
    }

    res.render("user/mobile-reset-password", {
      token: req.params.token,
      messages: req.flash(),
      pageTitle: "Set New Password",
      layout: false
    });
  } catch (error) {
    console.error("Error in GET /password/reset/:token:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/password/reset/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("back");
    }

    const { password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match.");
      return res.redirect("back");
    }

    await user.setPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash("success", "Your password has been successfully updated. You can now log in.");
    res.redirect("/login");

  } catch (error) {
    console.error("Error in POST /password/reset/:token:", error);
    res.status(500).send("Failed to reset password. Please try again.");
  }
});

module.exports = router;
