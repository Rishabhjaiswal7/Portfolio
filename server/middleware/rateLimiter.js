const rateLimit = require('express-rate-limit');

// Maximum 3 messages per IP every hour
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    message: "You've reached the message limit. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Maximum 15 OTP code requests per IP every 15 minutes
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: {
    message: 'Too many verification code requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const testimonialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, 
  message: {
    message: 'Too many testimonial submissions from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  contactLimiter,
  otpLimiter,
  testimonialLimiter,
};
