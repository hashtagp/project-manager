import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter based on email service
const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE?.toLowerCase();
  
  if (emailService === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
      },
    });
  } else if (emailService === 'outlook' || emailService === 'hotmail') {
    return nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else {
    // Custom SMTP configuration
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
};

const transporter = createTransporter();
const fromEmail = process.env.FROM_EMAIL;

export const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: `TaskHub <${fromEmail}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    
    return false;
  }
};