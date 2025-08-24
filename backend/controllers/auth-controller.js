import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Verification from "../models/verification.js";
import { sendEmail } from "../libs/send-email.js";
import aj from "../libs/arcjet.js";

const registerUser = async (req, res) => {
  console.log("🚀 [AUTH] Registration attempt started");
  console.log("📧 [AUTH] Registration data:", { email: req.body.email, name: req.body.name });
  
  try {
    const { email, name, password } = req.body;

    console.log("🔒 [ARCJET] Running email validation for:", email);
    const decision = await aj.protect(req, { email });
    console.log("🔒 [ARCJET] Decision result:", { isDenied: decision.isDenied(), reason: decision.reason });

    if (decision.isDenied()) {
      console.log("❌ [ARCJET] Email validation failed for:", email);
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Invalid email address" }));
      return;
    }

    console.log("🔍 [AUTH] Checking if user already exists:", email);
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("❌ [AUTH] User already exists:", email);
      return res.status(400).json({
        message: "Email address already in use",
      });
    }

    console.log("🔐 [AUTH] Hashing password for user:", email);
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    console.log("💾 [AUTH] Creating new user in database:", email);
    const newUser = await User.create({
      email,
      password: hashPassword,
      name,
    });
    console.log("✅ [AUTH] User created successfully with ID:", newUser._id);

    console.log("🎫 [AUTH] Generating verification token for user:", newUser._id);
    const verificationToken = jwt.sign(
      { userId: newUser._id, purpose: "email-verification" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("💾 [AUTH] Saving verification token to database");
    await Verification.create({
      userId: newUser._id,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
    });

    // send email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailBody = `<p>Click <a href="${verificationLink}">here</a> to verify your email</p>`;
    const emailSubject = "Verify your email";

    console.log("📧 [EMAIL] Sending verification email to:", email);
    const isEmailSent = await sendEmail(email, emailSubject, emailBody);

    if (!isEmailSent) {
      console.log("❌ [EMAIL] Failed to send verification email to:", email);
      return res.status(500).json({
        message: "Failed to send verification email",
      });
    }

    console.log("✅ [AUTH] Registration completed successfully for:", email);
    res.status(201).json({
      message:
        "Verification email sent to your email. Please check and verify your account.",
    });
  } catch (error) {
    console.error("💥 [AUTH] Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  console.log("🔐 [AUTH] Login attempt started");
  console.log("📧 [AUTH] Login data:", { email: req.body.email });
  
  try {
    const { email, password } = req.body;

    console.log("🔍 [AUTH] Finding user by email:", email);
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("❌ [AUTH] User not found:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("✅ [AUTH] User found:", { id: user._id, isEmailVerified: user.isEmailVerified });

    if (!user.isEmailVerified) {
      console.log("⚠️ [AUTH] Email not verified for user:", user._id);
      
      const existingVerification = await Verification.findOne({
        userId: user._id,
      });

      if (existingVerification && existingVerification.expiresAt > new Date()) {
        console.log("📧 [AUTH] Existing verification found, email not expired");
        return res.status(400).json({
          message:
            "Email not verified. Please check your email for the verification link.",
        });
      } else {
        console.log("🔄 [AUTH] Verification expired or not found, creating new verification");
        
        if (existingVerification) {
          await Verification.findByIdAndDelete(existingVerification._id);
          console.log("🗑️ [AUTH] Deleted expired verification token");
        }

        const verificationToken = jwt.sign(
          { userId: user._id, purpose: "email-verification" },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        await Verification.create({
          userId: user._id,
          token: verificationToken,
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        });

        // send email
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        const emailBody = `<p>Click <a href="${verificationLink}">here</a> to verify your email</p>`;
        const emailSubject = "Verify your email";

        console.log("📧 [EMAIL] Sending new verification email to:", email);
        const isEmailSent = await sendEmail(email, emailSubject, emailBody);

        if (!isEmailSent) {
          console.log("❌ [EMAIL] Failed to send verification email to:", email);
          return res.status(500).json({
            message: "Failed to send verification email",
          });
        }

        console.log("✅ [EMAIL] New verification email sent to:", email);
        return res.status(201).json({
          message:
            "Verification email sent to your email. Please check and verify your account.",
        });
      }
    }

    console.log("🔐 [AUTH] Validating password for user:", user._id);
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("❌ [AUTH] Invalid password for user:", user._id);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("🎫 [AUTH] Generating JWT token for user:", user._id);
    const token = jwt.sign(
      { userId: user._id, purpose: "login" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("💾 [AUTH] Updating last login time for user:", user._id);
    user.lastLogin = new Date();
    await user.save();

    const userData = user.toObject();
    delete userData.password;

    console.log("✅ [AUTH] Login successful for user:", user._id);
    res.status(200).json({
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("💥 [AUTH] Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyEmail = async (req, res) => {
  console.log("✉️ [EMAIL] Email verification attempt started");
  
  try {
    const { token } = req.body;
    console.log("🎫 [EMAIL] Verifying token:", token ? "Token provided" : "No token");

    console.log("🔍 [EMAIL] Verifying JWT token");
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload) {
      console.log("❌ [EMAIL] Invalid JWT payload");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId, purpose } = payload;
    console.log("📋 [EMAIL] Token payload:", { userId, purpose });

    if (purpose !== "email-verification") {
      console.log("❌ [EMAIL] Invalid token purpose:", purpose);
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("🔍 [EMAIL] Finding verification record for user:", userId);
    const verification = await Verification.findOne({
      userId,
      token,
    });

    if (!verification) {
      console.log("❌ [EMAIL] Verification record not found for user:", userId);
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("⏰ [EMAIL] Checking token expiration");
    const isTokenExpired = verification.expiresAt < new Date();

    if (isTokenExpired) {
      console.log("❌ [EMAIL] Token expired for user:", userId);
      return res.status(401).json({ message: "Token expired" });
    }

    console.log("🔍 [EMAIL] Finding user by ID:", userId);
    const user = await User.findById(userId);

    if (!user) {
      console.log("❌ [EMAIL] User not found:", userId);
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.isEmailVerified) {
      console.log("⚠️ [EMAIL] Email already verified for user:", userId);
      return res.status(400).json({ message: "Email already verified" });
    }

    console.log("✅ [EMAIL] Marking email as verified for user:", userId);
    user.isEmailVerified = true;
    await user.save();

    console.log("🗑️ [EMAIL] Deleting verification record");
    await Verification.findByIdAndDelete(verification._id);

    console.log("🎉 [EMAIL] Email verification completed successfully for user:", userId);
    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("💥 [EMAIL] Email verification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const resetPasswordRequest = async (req, res) => {
  console.log("🔐 [RESET] Password reset request started");
  
  try {
    const { email } = req.body;
    console.log("📧 [RESET] Password reset requested for email:", email);

    console.log("🔍 [RESET] Finding user by email:", email);
    const user = await User.findOne({ email });

    if (!user) {
      console.log("❌ [RESET] User not found:", email);
      return res.status(400).json({ message: "User not found" });
    }

    console.log("✅ [RESET] User found:", { id: user._id, isEmailVerified: user.isEmailVerified });

    if (!user.isEmailVerified) {
      console.log("❌ [RESET] Email not verified for user:", user._id);
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }

    console.log("🔍 [RESET] Checking for existing verification token");
    const existingVerification = await Verification.findOne({
      userId: user._id,
    });

    if (existingVerification && existingVerification.expiresAt > new Date()) {
      console.log("⚠️ [RESET] Active reset token already exists for user:", user._id);
      return res.status(400).json({
        message: "Reset password request already sent",
      });
    }

    if (existingVerification && existingVerification.expiresAt < new Date()) {
      console.log("🗑️ [RESET] Deleting expired verification token");
      await Verification.findByIdAndDelete(existingVerification._id);
    }

    console.log("🎫 [RESET] Generating reset password token");
    const resetPasswordToken = jwt.sign(
      { userId: user._id, purpose: "reset-password" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    console.log("💾 [RESET] Saving reset password token to database");
    await Verification.create({
      userId: user._id,
      token: resetPasswordToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const resetPasswordLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetPasswordToken}`;
    const emailBody = `<p>Click <a href="${resetPasswordLink}">here</a> to reset your password</p>`;
    const emailSubject = "Reset your password";

    console.log("📧 [EMAIL] Sending password reset email to:", email);
    const isEmailSent = await sendEmail(email, emailSubject, emailBody);

    if (!isEmailSent) {
      console.log("❌ [EMAIL] Failed to send reset password email to:", email);
      return res.status(500).json({
        message: "Failed to send reset password email",
      });
    }

    console.log("✅ [RESET] Password reset email sent successfully to:", email);
    res.status(200).json({ message: "Reset password email sent" });
  } catch (error) {
    console.error("💥 [RESET] Password reset request error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyResetPasswordTokenAndResetPassword = async (req, res) => {
  console.log("🔐 [RESET] Password reset verification started");
  
  try {
    const { token, newPassword, confirmPassword } = req.body;
    console.log("🎫 [RESET] Verifying reset password token:", token ? "Token provided" : "No token");

    console.log("🔍 [RESET] Verifying JWT token");
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload) {
      console.log("❌ [RESET] Invalid JWT payload");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId, purpose } = payload;
    console.log("📋 [RESET] Token payload:", { userId, purpose });

    if (purpose !== "reset-password") {
      console.log("❌ [RESET] Invalid token purpose:", purpose);
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("🔍 [RESET] Finding verification record for user:", userId);
    const verification = await Verification.findOne({
      userId,
      token,
    });

    if (!verification) {
      console.log("❌ [RESET] Verification record not found for user:", userId);
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("⏰ [RESET] Checking token expiration");
    const isTokenExpired = verification.expiresAt < new Date();

    if (isTokenExpired) {
      console.log("❌ [RESET] Token expired for user:", userId);
      return res.status(401).json({ message: "Token expired" });
    }

    console.log("🔍 [RESET] Finding user by ID:", userId);
    const user = await User.findById(userId);

    if (!user) {
      console.log("❌ [RESET] User not found:", userId);
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("🔍 [RESET] Validating password match");
    if (newPassword !== confirmPassword) {
      console.log("❌ [RESET] Passwords do not match for user:", userId);
      return res.status(400).json({ message: "Passwords do not match" });
    }

    console.log("🔐 [RESET] Hashing new password for user:", userId);
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);

    console.log("💾 [RESET] Updating user password");
    user.password = hashPassword;
    await user.save();

    console.log("🗑️ [RESET] Deleting verification record");
    await Verification.findByIdAndDelete(verification._id);

    console.log("🎉 [RESET] Password reset completed successfully for user:", userId);
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("💥 [RESET] Password reset error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export {
  registerUser,
  loginUser,
  verifyEmail,
  resetPasswordRequest,
  verifyResetPasswordTokenAndResetPassword,
};
