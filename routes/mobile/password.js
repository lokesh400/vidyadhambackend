const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const crypto = require("crypto");
const { sendResetPasswordEmail } = require("../../utils/mailer");

router.post("/forget/reset-password", async (req, res) => {
  try {
    const identifier = req.body.identifier;
    
    // Find user by rollNumber, email, or username based on identifier provided
    const usr = await User.findOne({
      $or: [
        { rollNumber: identifier },
        { email: identifier },
        { username: identifier }
      ]
    });

    if (!usr) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    const email = usr.email;
    if (!email) {
       return res.status(400).json({ success: false, message: "User does not have an associated email address." });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Set token & expiry (1 hour)
    usr.resetPasswordToken = resetToken;
    usr.resetPasswordExpires = Date.now() + 3600000;
    await usr.save();

    // Create reset URL

    // const resetUrl = `https://m.vidyadhambook.com/password/reset/${resetToken}`;

    const resetUrl = `http://management.vidyadhambook.com/password/reset/${resetToken}`;

    // Send email
    const emailSent = await sendResetPasswordEmail(email, resetUrl);
    
    if (emailSent) {
       return res.json({ success: true, message: "Reset link sent. Please check your registered email." });
    } else {
       return res.status(500).json({ success: false, message: "Failed to send reset email." });
    }
  } catch (error) {
    console.error("Error in reset-password mobile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
