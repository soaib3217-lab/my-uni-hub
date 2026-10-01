const nodemailer = require('nodemailer');

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

if (!user || !pass) {
    console.error("Error: EMAIL_USER and EMAIL_PASS environment variables must be set.");
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user,
        pass
    }
});

async function test() {
    try {
        console.log("Attempting to send test email to:", user);
        const info = await transporter.sendMail({
            from: user,
            to: user,
            subject: 'Test Email - Credentials Verified',
            text: 'This is a test email to verify credentials.'
        });
        console.log("Email sent successfully! Message ID:", info.messageId);
    } catch (err) {
        console.error("Failed to send email:", err.message);
    }
}

test();
