const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const ContactMessage = require('../models/ContactMessage');
const EmailOtp = require('../models/EmailOtp');

// Simple XSS sanitization helper
const sanitize = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim();
};

// GET /api/config (Public settings configuration)
exports.getConfig = (req, res) => {
  return res.status(200).json({
    githubUrl: process.env.GITHUB_URL || 'https://github.com/Rishabhjaiswal7',
    linkedinUrl: process.env.LINKEDIN_URL || 'https://linkedin.com/in/rishabhjaiswal7',
    email: process.env.PORTFOLIO_EMAIL || 'rishabhjaiswal9029@ce.du.ac.in',
    phone: process.env.PORTFOLIO_PHONE || '+919336730994',
    googleMapsUrl: process.env.GOOGLE_MAPS_URL || 'https://www.google.com/maps/search/?api=1&query=New+Delhi,+India',
    captchaSiteKey: process.env.CAPTCHA_SITE_KEY || '',
    captchaType: process.env.CAPTCHA_TYPE || 'turnstile', // 'turnstile' or 'recaptcha'
  });
};

// POST /api/contact/verify-email-send (Trigger OTP email)
exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  // 1. Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  // 2. Reject disposable email domains
  const disposableDomains = [
    'mailinator.com', 'yopmail.com', 'tempmail.com', 'trashmail.com', 'guerrillamail.com',
    'sharklasers.com', 'getairmail.com', 'dispostable.com', '10minutemail.com',
    'maildrop.cc', 'temp-mail.org', 'fakeinbox.com', 'throwawaymail.com', 'mailnesia.com',
    'mailcatch.com', 'mintemail.com', 'getnada.com', 'guerrillamailblock.com', 'guerrillamail.net',
    'guerrillamail.org', 'guerrillamail.biz', 'guerrillamail.co', 'guerrillamail.de'
  ];
  const domain = email.split('@')[1].toLowerCase();
  if (disposableDomains.includes(domain)) {
    return res.status(400).json({ message: 'Disposable email addresses are not accepted.' });
  }

  try {
    // 3. Enforce 60s cooldown limit
    const existing = await EmailOtp.findOne({ email });
    if (existing && (Date.now() - existing.lastSentAt.getTime() < 60 * 1000)) {
      const waitSeconds = Math.ceil(60 - (Date.now() - existing.lastSentAt.getTime()) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting another code.` });
    }

    // 4. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // 5. Save/Update code in DB
    await EmailOtp.findOneAndUpdate(
      { email },
      { otp, expiresAt, lastSentAt: new Date() },
      { upsert: true, new: true }
    );

    // 6. Send OTP Mail via SMTP transporter
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"Rishabh Jaiswal Portfolio" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Email Verification OTP Code',
        text: `Your verification code is: ${otp}. This code is valid for 5 minutes. If you did not request this verification, please ignore this email.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #3fa796; text-align: center;">Verify Your Email Address</h2>
            <p>Hello,</p>
            <p>Thank you for connecting with me. Please use the following One-Time Password (OTP) to complete verification for your message:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 30px 0; color: #1a202c; padding: 12px; background: #f7fafc; border-radius: 6px;">
              ${otp}
            </div>
            <p style="font-size: 13px; color: #718096; text-align: center;">This code will expire in 5 minutes.</p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP verification email sent to: ${email}`);
      } catch (mailErr) {
        console.warn(`SMTP delivery failed, but OTP remains active in DB. Error:`, mailErr.message);
        console.log(`[DEVELOPER MOCK VERIFICATION] OTP for ${email} is: ${otp}`);
      }
    } else {
      console.log(`[DEV MODE] OTP for ${email} is: ${otp}`);
    }

    return res.status(200).json({ success: true, message: 'Verification OTP sent successfully.' });
  } catch (error) {
    console.error('Send OTP error:', error.message);
    return res.status(500).json({ message: 'Server error sending verification code.' });
  }
};

// POST /api/contact/verify-email-otp (Verify OTP & return signed JWT token)
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP code are required.' });
  }

  try {
    const record = await EmailOtp.findOne({ email: email.toLowerCase(), otp });
    if (!record) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    if (record.expiresAt < new Date()) {
      await EmailOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: 'Verification code has expired.' });
    }

    // Success -> Delete OTP code
    await EmailOtp.deleteOne({ _id: record._id });

    // Generate Short-lived Signed JWT token for proof
    const tokenPayload = { email: email.toLowerCase(), otpVerified: true };
    const verificationToken = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '15m' });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      verificationToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    return res.status(500).json({ message: 'Server error verifying OTP.' });
  }
};

// POST /api/contact (Sanitize inputs, verify tokens, capture Turnstile/reCAPTCHA, save, and notify)
exports.submitMessage = async (req, res) => {
  const { name, email, phone, company, subject, message, verificationToken, captchaToken } = req.body;

  // 1. Sanitize and validate basic parameters
  const sanitizedName = sanitize(name);
  const sanitizedEmail = sanitize(email).toLowerCase();
  const sanitizedPhone = sanitize(phone);
  const sanitizedCompany = sanitize(company);
  const sanitizedSubject = sanitize(subject);
  const sanitizedMsg = sanitize(message);

  if (!sanitizedName || !sanitizedEmail || !sanitizedSubject) {
    return res.status(400).json({ message: 'Required fields (Name, Email, Subject) are missing.' });
  }

  try {
    // 2. Prevent duplicate messages (5 minutes window)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingDuplicate = await ContactMessage.findOne({
      email: sanitizedEmail,
      message: sanitizedMsg,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existingDuplicate) {
      return res.status(400).json({ message: 'Duplicate message detected. Please wait a few minutes before resubmitting.' });
    }

    // 3. Cryptographic Verification Token Validation
    if (!verificationToken) {
      return res.status(403).json({ message: 'Email verification is required before sending.' });
    }

    try {
      const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET || 'fallback_secret');
      if (decoded.email !== sanitizedEmail || !decoded.otpVerified) {
        return res.status(403).json({ message: 'Verification token mismatches the sender email.' });
      }
    } catch (jwtErr) {
      return res.status(403).json({ message: 'Email verification token has expired or is invalid.' });
    }

    // 4. Captcha Verification (Turnstile/reCAPTCHA siteverify API)
    let hasCaptchaVerified = false;
    const captchaSecret = process.env.CAPTCHA_SECRET_KEY;
    const captchaType = process.env.CAPTCHA_TYPE || 'turnstile';

    if (captchaSecret && captchaToken) {
      try {
        const verifyUrl = captchaType === 'recaptcha'
          ? 'https://www.google.com/recaptcha/api/siteverify'
          : 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

        const capRes = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(captchaSecret)}&response=${encodeURIComponent(captchaToken)}`
        });

        if (capRes.ok) {
          const capData = await capRes.json();
          if (capData.success) {
            hasCaptchaVerified = true;
          } else {
            return res.status(400).json({ message: 'Security validation check failed. Please solve the captcha again.' });
          }
        }
      } catch (capErr) {
        console.error('Captcha API verification error:', capErr.message);
        // Fallback or skip if connection fails
      }
    }

    // 5. Store message in DB
    const newMessage = new ContactMessage({
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      company: sanitizedCompany,
      subject: sanitizedSubject,
      message: sanitizedMsg,
      verified: hasCaptchaVerified,
      otpVerified: true,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
    });

    await newMessage.save();

    // 6. Deliver SMTP Notifications asynchronously
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Admin Email Alert
      const adminMail = {
        from: `"${sanitizedName} (Portfolio)" <${process.env.EMAIL_USER}>`,
        to: process.env.PORTFOLIO_EMAIL || 'rishabhjaiswal9029@ce.du.ac.in',
        replyTo: sanitizedEmail,
        subject: `Portfolio Contact: ${sanitizedSubject}`,
        text: `New contact submission received:\n\n` +
              `Name: ${sanitizedName}\n` +
              `Email: ${sanitizedEmail}\n` +
              `Phone: ${sanitizedPhone || 'N/A'}\n` +
              `Company: ${sanitizedCompany || 'N/A'}\n` +
              `IP: ${newMessage.ipAddress}\n` +
              `Captcha Check Passed: ${hasCaptchaVerified}\n\n` +
              `Message:\n${sanitizedMsg}`
      };

      // Auto-reply confirmation to sender
      const userMail = {
        from: `"Rishabh Jaiswal" <${process.env.EMAIL_USER}>`,
        to: sanitizedEmail,
        subject: 'Thanks for contacting me',
        text: `Hi ${sanitizedName},\n\n` +
              `Thank you for reaching out.\n\n` +
              `I have received your message and will respond as soon as possible.\n\n` +
              `Regards,\nRishabh Jaiswal`
      };

      transporter.sendMail(adminMail).catch(err => console.error('Admin alert failed:', err.message));
      transporter.sendMail(userMail).catch(err => console.error('Auto-reply failed:', err.message));
    }

    return res.status(201).json({
      success: true,
      message: "Your message has been sent successfully. I'll get back to you soon."
    });
  } catch (error) {
    console.error('Submit contact message error:', error.message);
    return res.status(500).json({ message: 'Server error processing form submission.' });
  }
};
