const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send a 6-digit OTP to the specified email address.
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} role - 'driver' or 'police'
 */
async function sendOTP(email, otp, role = 'user') {
  const roleLabel = role === 'police' ? '🚔 Police Officer' : '🚑 Ambulance Driver';
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'SmartAmbulance <noreply@smartambulance.com>',
    to: email,
    subject: `Your SmartAmbulance Verification Code`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f4f7ff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1a56db; font-size: 24px; margin: 0;">🚑 SmartAmbulance</h1>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Context-Aware Emergency Routing System</p>
        </div>

        <div style="background: white; border-radius: 10px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <p style="color: #374151; font-size: 16px; margin-top: 0;">Hello ${roleLabel},</p>
          <p style="color: #374151;">Your one-time verification code is:</p>

          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #1a56db; background: #eff6ff; padding: 16px 28px; border-radius: 10px; border: 2px dashed #93c5fd;">
              ${otp}
            </span>
          </div>

          <p style="color: #6b7280; font-size: 13px;">
            ⏰ This code expires in <strong>10 minutes</strong>.<br/>
            Do not share this code with anyone.
          </p>
        </div>

        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️  OTP sent to ${email}`);
}

/**
 * Generate a random 6-digit OTP string.
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = { sendOTP, generateOTP };
