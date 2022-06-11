const nodemailer = require("nodemailer");

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_FROM, // generated ethereal user
        pass: process.env.SMTP_EMAIL_PASSWORD, // generated ethereal password
    },
});

exports.sendEmail = async (emailData) => {
    //Email Data Sending
    try {
        transporter.sendMail(emailData)
        return { "status": 200, "message": '' };
    } catch (error) {
        return { "status": 400, "message": error.message };
    }

}