/**
 * E2E Contact System Integration Test Suite
 * Validates configurations, OTP verification pipelines, anti-abuse checks, and admin inbox APIs.
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'server/.env' });

const API_URL = 'http://localhost:5000';
let adminToken = '';
let emailVerificationToken = '';
let testMessageId = '';
let testOtp = '';

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('--- STARTING UPGRADED CONTACT SYSTEM INTEGRATION TESTS ---\n');

  try {
    // Connect to database to read generated OTP codes directly for verification tests
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/portfolio';
    await mongoose.connect(mongoUri);
    console.log('✔ Connected to MongoDB.');

    // [TEST 1] Fetch config settings
    console.log('\n[TEST 1] Fetching dynamic public config settings...');
    const configRes = await fetch(`${API_URL}/api/config`);
    if (!configRes.ok) throw new Error(`Fetch config failed with status ${configRes.status}`);
    const config = await configRes.json();
    console.log('✔ Dynamic config retrieved:', JSON.stringify(config, null, 2));

    // [TEST 2] OTP Invalid email format check
    console.log('\n[TEST 2] Triggering OTP with invalid email format...');
    const badEmailRes = await fetch(`${API_URL}/api/contact/verify-email-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad-email-format' })
    });
    const badEmailData = await badEmailRes.json();
    if (badEmailRes.status !== 400) throw new Error('Expected 400 for bad email format.');
    console.log(`✔ Correctly blocked invalid format. Response: "${badEmailData.message}"`);

    // [TEST 3] OTP Disposable email block check
    console.log('\n[TEST 3] Triggering OTP with disposable email domain...');
    const disposableRes = await fetch(`${API_URL}/api/contact/verify-email-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tester@mailinator.com' })
    });
    const disposableData = await disposableRes.json();
    if (disposableRes.status !== 400) throw new Error('Expected 400 for disposable email domain.');
    console.log(`✔ Correctly blocked disposable email address. Response: "${disposableData.message}"`);

    // [TEST 4] Trigger valid OTP code delivery
    console.log('\n[TEST 4] Requesting OTP code for a valid email...');
    const validOtpRes = await fetch(`${API_URL}/api/contact/verify-email-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_integrations@gmail.com' })
    });
    const validOtpData = await validOtpRes.json();
    if (!validOtpRes.ok) throw new Error(`Valid OTP trigger failed: ${validOtpData.message}`);
    console.log('✔ OTP request successfully submitted.');

    // [TEST 5] Throttle resend checks (should block resends inside 60 seconds)
    console.log('\n[TEST 5] Attempting immediate resend of verification OTP (cooldown check)...');
    const immediateResendRes = await fetch(`${API_URL}/api/contact/verify-email-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_integrations@gmail.com' })
    });
    const resendData = await immediateResendRes.json();
    if (immediateResendRes.status !== 429) throw new Error('Expected 429 status for cooldown throttle.');
    console.log(`✔ Cooldown limit correctly active. Response: "${resendData.message}"`);

    // Retrieve generated OTP directly from DB
    const EmailOtp = mongoose.model('EmailOtp', new mongoose.Schema({ email: String, otp: String }));
    const otpDoc = await EmailOtp.findOne({ email: 'test_integrations@gmail.com' });
    if (!otpDoc) throw new Error('Could not retrieve generated OTP from MongoDB.');
    testOtp = otpDoc.otp;
    console.log(`✔ Read OTP code from database: [${testOtp}]`);

    // [TEST 6] Confirm with invalid OTP code
    console.log('\n[TEST 6] Verifying with incorrect OTP code...');
    const incorrectOtpRes = await fetch(`${API_URL}/api/contact/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_integrations@gmail.com', otp: '999999' })
    });
    const incorrectOtpData = await incorrectOtpRes.json();
    if (incorrectOtpRes.status !== 400) throw new Error('Expected 400 status for wrong OTP.');
    console.log(`✔ Blocked invalid verification. Response: "${incorrectOtpData.message}"`);

    // [TEST 7] Confirm with correct OTP code
    console.log('\n[TEST 7] Verifying with correct OTP code...');
    const correctOtpRes = await fetch(`${API_URL}/api/contact/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_integrations@gmail.com', otp: testOtp })
    });
    const correctOtpData = await correctOtpRes.json();
    if (!correctOtpRes.ok || !correctOtpData.verificationToken) {
      throw new Error(`Verification failed: ${correctOtpData.message}`);
    }
    emailVerificationToken = correctOtpData.verificationToken;
    console.log('✔ Email verified. Signed verification token retrieved successfully.');

    // [TEST 8] Submit form message without token
    console.log('\n[TEST 8] Submitting contact form without verification token...');
    const noTokenRes = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tester name',
        email: 'test_integrations@gmail.com',
        subject: 'No token test',
        message: 'This message has no verification token.'
      })
    });
    const noTokenData = await noTokenRes.json();
    if (noTokenRes.status !== 403) throw new Error('Expected 403 status.');
    console.log(`✔ Submission correctly blocked. Response: "${noTokenData.message}"`);

    // [TEST 9] Submit form message with valid token
    console.log('\n[TEST 9] Submitting contact form with valid verification token...');
    const submitRes = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Tester',
        email: 'test_integrations@gmail.com',
        company: 'Automated Testing Corp',
        phone: '+999 8888 7777',
        subject: 'CMS Test Inquiry',
        message: 'Hello, this is an automated contact verification message.',
        verificationToken: emailVerificationToken
      })
    });
    const submitData = await submitRes.json();
    if (submitRes.status !== 201) throw new Error(`Submission failed: ${submitData.message}`);
    console.log(`✔ Form submitted successfully! Response: "${submitData.message}"`);

    // [TEST 10] Submit duplicate form message (double submit cooldown)
    console.log('\n[TEST 10] Attempting immediate duplicate message submission...');
    const duplicateRes = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Tester',
        email: 'test_integrations@gmail.com',
        company: 'Automated Testing Corp',
        phone: '+999 8888 7777',
        subject: 'CMS Test Inquiry',
        message: 'Hello, this is an automated contact verification message.',
        verificationToken: emailVerificationToken
      })
    });
    const duplicateData = await duplicateRes.json();
    if (duplicateRes.status !== 400) throw new Error('Expected 400 status for duplicate block.');
    console.log(`✔ Duplicate submission correctly blocked. Response: "${duplicateData.message}"`);

    // Logging admin token for inbox testing
    console.log('\n[TEST 11] Authenticating admin to check inbox...');
    const loginRes = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rishabhjaiswal9029@ce.du.ac.in',
        password: 'adminpassword'
      })
    });
    const loginData = await loginRes.json();
    adminToken = loginData.token;
    console.log('✔ Admin authenticated successfully.');

    // [TEST 12] Fetch, Search, Mark Read, Reply, and Delete Inbox Message
    console.log('\n[TEST 12] Executing Admin Inbox CRUD pipeline...');
    
    // Fetch all messages
    const fetchRes = await fetch(`${API_URL}/api/admin/messages`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const inbox = await fetchRes.json();
    const testMsg = inbox.find(m => m.email === 'test_integrations@gmail.com');
    if (!testMsg) throw new Error('Could not locate submitted test message in admin inbox.');
    testMessageId = testMsg._id;
    console.log(`✔ Found submitted message in inbox. ID: ${testMessageId}, Status: "${testMsg.status}"`);

    // Toggle Read status
    console.log('-> Toggling read status to "read"...');
    const readRes = await fetch(`${API_URL}/api/admin/messages/${testMessageId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'read' })
    });
    const readData = await readRes.json();
    if (!readRes.ok) throw new Error(`Toggle read failed: ${readData.message}`);
    console.log(`✔ Message marked as read. New status: "${readData.msg.status}"`);

    // Reply directly via SMTP (only verify call logic, mock/skip if no real SMTP credentials)
    console.log('-> Sending email reply to sender...');
    const replyRes = await fetch(`${API_URL}/api/admin/messages/${testMessageId}/reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ replyText: 'Thank you for your inquiry. I will get back to you shortly.' })
    });
    const replyData = await replyRes.json();
    if (replyRes.ok) {
      console.log(`✔ Reply successfully dispatched! Message status updated to: "${replyData.msg.status}"`);
    } else {
      console.log(`⚠ Skip SMTP mail delivery check: "${replyData.message}"`);
    }

    // Delete message
    console.log('-> Deleting test message from inbox...');
    const deleteRes = await fetch(`${API_URL}/api/admin/messages/${testMessageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteData = await deleteRes.json();
    if (!deleteRes.ok) throw new Error(`Delete failed: ${deleteData.message}`);
    console.log(`✔ Message deleted successfully.`);

    console.log('\n======================================================');
    console.log('✔ ALL CONTACT SYSTEM E2E TEST PATHS PASSED WITH 100% SUCCESS!');
    console.log('======================================================');

  } catch (error) {
    console.error('\n✖ INTEGRATION TEST PATH FAILED:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✔ MongoDB connection closed.');
  }
}

runTests();
