const nodemailer = require('nodemailer');
const ContactMessage = require('../models/ContactMessage');

// GET /api/admin/messages (Admin List messages, search and filters)
exports.getMessages = async (req, res) => {
  const { status, verified, search } = req.query;
  const filter = {};

  // Status Filter
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Verified Filter
  if (verified === 'verified') {
    filter.otpVerified = true;
  } else if (verified === 'unverified') {
    filter.otpVerified = false;
  }

  // Text search on multiple fields
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { company: searchRegex },
      { subject: searchRegex },
      { message: searchRegex },
      { phone: searchRegex }
    ];
  }

  try {
    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(messages);
  } catch (error) {
    console.error('Fetch admin messages error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving messages.' });
  }
};

// PUT /api/admin/messages/:id/read (Toggle read status)
exports.toggleRead = async (req, res) => {
  const { status } = req.body; // 'read' or 'unread'
  
  if (!['read', 'unread'].includes(status)) {
    return res.status(400).json({ message: "Invalid status parameter. Must be 'read' or 'unread'." });
  }

  try {
    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    msg.status = status;
    await msg.save();

    return res.status(200).json({ success: true, message: `Message marked as ${status}.`, msg });
  } catch (error) {
    console.error('Toggle read status error:', error.message);
    return res.status(500).json({ message: 'Server error toggling read status.' });
  }
};

// POST /api/admin/messages/:id/reply (Reply directly via SMTP nodemailer)
exports.replyMessage = async (req, res) => {
  const { replyText } = req.body;
  if (!replyText) {
    return res.status(400).json({ message: 'Reply text is required.' });
  }

  try {
    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Send SMTP reply to sender
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const replyMail = {
        from: `"Rishabh Jaiswal" <${process.env.EMAIL_USER}>`,
        to: msg.email,
        subject: `Re: ${msg.subject}`,
        text: `${replyText}\n\n---\nOriginal message sent by ${msg.name} on ${new Date(msg.createdAt).toLocaleDateString()}:\n\n${msg.message}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #2d3748;">
            <div style="margin-bottom: 24px; white-space: pre-wrap;">${replyText.replace(/\n/g, '<br>')}</div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <div style="font-size: 12px; color: #718096; background: #f7fafc; padding: 14px; border-radius: 6px;">
              <strong>Original Message:</strong><br>
              <strong>From:</strong> ${msg.name} (${msg.email})<br>
              <strong>Date:</strong> ${new Date(msg.createdAt).toLocaleString()}<br>
              <strong>Subject:</strong> ${msg.subject}<br><br>
              ${msg.message.replace(/\n/g, '<br>')}
            </div>
          </div>
        `
      };

      await transporter.sendMail(replyMail);
      console.log(`Reply successfully delivered to: ${msg.email}`);

      // Mark status as replied
      msg.status = 'replied';
      await msg.save();

      return res.status(200).json({ success: true, message: 'Reply sent and message marked as Replied.', msg });
    } else {
      return res.status(400).json({ message: 'SMTP credentials not configured on the server. Cannot send reply email.' });
    }
  } catch (error) {
    console.error('Send SMTP reply error:', error.message);
    return res.status(500).json({ message: 'Server error delivering direct SMTP reply.' });
  }
};

// DELETE /api/admin/messages/:id (Delete message)
exports.deleteMessage = async (req, res) => {
  try {
    const msg = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found.' });
    }
    return res.status(200).json({ success: true, message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Delete message error:', error.message);
    return res.status(500).json({ message: 'Server error deleting message.' });
  }
};
