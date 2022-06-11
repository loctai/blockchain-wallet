const User = require("../models/auth.modules");
const expressJwt = require("express-jwt");
const _ = require("lodash");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { createWalletByUserId, userTokenBalance } = require('../helpers/walletHalper');
const { createSolWalletByUserId } = require('../helpers/solWalletHelper');
const WalletInfo = require("../models/walletInfo.modules");
const SolanaWalletInfo = require("../models/solanaWalletInfo.modules");
const otpGenerator = require('otp-generator')
const { sendEmail } = require('../utlis/email')

//custome error handler to get usefull errors from database errors
const { errorHandler } = require("../helpers/dbErrorHandling");

exports.registerOtpController = async (req, res) => {
    const { ganji_id, email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array().map((error) => error.msg)[0];
        return res.status(422).json({ error: firstError });
    }
    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: `User with this email ${email} is already exist.` });

    try {
        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false })
        let nweUser = new User({ ganji_id, otp, email, password });
        await nweUser.save();
        const emailData = registerEmailData(email, otp);
        //Email Data Sending
        const result = await sendEmail(emailData);
        if (result.status === 400)
            return res.status(result.status).json({ message: result.message });
        return res.status(result.status).json({ message: `OTP has been send to your email address ${email} kindly activate your account` });

    } catch (error) {
        return res.status(400).json({ message: error });
    }


}

exports.activationOTPAccount = async (req, res) => {
    const { email_id, otpCode } = req.body;
    if (!email_id && !otpCode)
        return res.status(400).json({ message: "Authentication Error!!" });

    let user = await User.findOne({ email: email_id, otp: otpCode })
    if (!user) return res.status(400).json({ message: "user with this token does not exist. kindly resend" });

    const updatedFields = { otp: "", isAccountVerified: true };
    user = _.extend(user, updatedFields);
    await user.save();

    const { _id, name, email, role } = user;
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const response = await createWalletByUserId(user._id);
    if (response.status === 400) {
        res.json({ data: { token, user: { user_id, name, email, role }, message: "wallet is not created please created the wallet" } });
    } else {
        //create solana wallet
        const solResponse = await createSolWalletByUserId(user._id);
        const solWalletDetail = (solResponse.status === 400) ? 'solana wallet not created kindly create solana wallet' : solResponse.data;
        //get token detail
        const tokenDetail = await userTokenBalance(response.data.walletAddress);
        res.json({ data: { token, user: { _id, name, email, role }, tokenDetail: tokenDetail, walletDetail: response.data, solanaWalletDetail: solWalletDetail } });
    }

}

exports.resendOtp = async (req, res) => {
    const { email } = req.body;
    let user = await User.findOne({ email: email, isAccountVerified: false });
    if (!user) return res.status(400).json({ message: "Your account is already activated kindly login" });

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false })

    const updatedField = { otp: otp, isAccountVerified: false };
    user = _.extend(user, updatedField);
    await user.save();

    const emailData = registerEmailData(email, otp);
    //Email Data Sending
    const result = await sendEmail(emailData);
    if (result.status === 400)
        return res.status(result.status).json({ message: result.message });
    return res.status(result.status).json({ message: `OTP has been send to your email address ${email} kindly activate your account` });
}

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array().map((error) => error.msg)[0];
        return res.status(422).json({ error: firstError, });
    } else {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User with this email does not exist, Register first" });

        if (!user.authenticate(password))
            return res.status(400).json({ error: "Email and Password do not match." });
        if (user.isAccountVerified === false)
            return res.status(400).json({ error: "Account is not verified please verify your account" });

        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false })

        const updatedField = { otp: otp };
        user = _.extend(user, updatedField);
        await user.save();
        const emailData = loginEmailData(email, otp)

        //Email Data Sending
        const result = await sendEmail(emailData);
        if (result.status === 400)
            return res.status(result.status).json({ message: result.message });
        return res.status(result.status).json({ message: `Verification code has been send to your email address ${email}` });
    }

}
exports.loginVerification = async (req, res) => {
    const { email_id, otpCode } = req.body;
    if (!email_id && !otpCode)
        return res.status(400).json({ message: "Authentication Error!!" });

    //let user = await User.findOne({ email: email_id, otp: otpCode })
    //for testing
    let user = await User.findOne({ email: email_id })
    if (!user) return res.status(400).json({ message: "Verification code is incorrect kindly enter correct one or resend" });


    //Generate Token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    //get ether wallet detail against user id
    const walletDetail = await WalletInfo.findOne({ user_id: user._id });
    //get solana wallet detail against user id
    const solWalletDetail = await SolanaWalletInfo.findOne({ user_id: user._id });
    const { _id, name, email, role } = user;

    const updatedFields = { otp: "" };
    user = _.extend(user, updatedFields);
    await user.save();

    if (!walletDetail) {
        res.json({ data: { token, user: { _id, name, email, role }, message: "wallet is not created please created the wallet" } });
    } else {
        const solanaWallet = (!solWalletDetail) ? 'solana wallet not created kindly create solana wallet' : solWalletDetail.public_key;
        //get token balance
        const tokenDetail = await userTokenBalance(walletDetail.wallet_address);
        res.json({ data: { token, user: { _id, name, email, role }, tokenDetail: tokenDetail, walletDetail: { walletAddress: walletDetail.wallet_address }, solanaWalletDetail: { public_key: solanaWallet } } });
    }
}

exports.reSendLoginOtp = async (req, res) => {
    const { email } = req.body;
    let user = await User.findOne({ email: email });
    if (!user) return res.status(400).json({ message: "User with this email does not exist, please Register first" });

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false })

    const updatedField = { otp: otp };
    user = _.extend(user, updatedField);
    await user.save();

    const emailData = loginEmailData(email, otp)
    //Email Data Sending
    const result = await sendEmail(emailData);
    if (result.status === 400)
        return res.status(result.status).json({ message: result.message });
    return res.status(result.status).json({ message: `Verification code has been send to your email address ${email}` });
}

const loginEmailData = (email, otp) => {
    const emailData = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Verification code for Login",
        html: `<h3>Verification code: </h3> 
    <h1 style='font-weight:bold;'>  ${otp} </h1> <h3>Do not share this code with anyone</h3>
    `,
    }
    return emailData;
}
const registerEmailData = (email, otp) => {
    const emailData = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Verification code for registration",
        html: `
        <h3>Verification code for account verification is </h3> 
        <h1 style='font-weight:bold;'>  ${otp} </h1>
        `,
    };
    return emailData;
}
exports.forgetPassword = async (req, res) => {
    const { email } = req.body;
    const errors = validationResult(req);
    // validation to req.body
    if (!errors.isEmpty()) {
        const firstError = errors.array().map((error) => error.msg)[0];
        return res.status(422).json({ message: firstError });
    } else {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User with this email does not exist, Signup first" });
        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false })

        //forget password Email Data Sending
        const emailData = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: "Otp for reset password",
            html: ` <h3>OTP for Reset Password is </h3> 
                    <h1 style='font-weight:bold;'>  ${otp} </h1>`
        };
        try {
            await user.updateOne({ resetPasswordOtp: otp });
            const result = await sendEmail(emailData);
            if (result.status === 400)
                return res.status(result.status).json({ message: result.message });
            return res.status(result.status).json({ message: `Reset Password code has been sent to ${email}` });

        } catch (error) {
            return res.status(400).json({ message: errorHandler(error) });
        }
    }
}

exports.resendOtpResetPassword = async (req, res) => {
    const { email } = req.body;
    let user = await User.findOne({ email: email });
    if (!user) return res.status(400).json({ message: "User with this email does not exist, please Register first" });

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false })

    const updatedField = { resetPasswordOtp: otp };
    user = _.extend(user, updatedField);
    await user.save();

    const emailData = loginEmailData(email, otp)
    //Email Data Sending
    const result = await sendEmail(emailData);
    if (result.status === 400)
        return res.status(result.status).json({ message: result.message });
    return res.status(result.status).json({ message: `Reset code has been send to your email address ${email}` });
}

exports.restPassword = async (req, res) => {
    const { resetPasswordOtp, newPassword } = req.body;
    const errors = validationResult(req);
    // validation to req.body
    if (!errors.isEmpty()) {
        const firstError = errors.array().map((error) => error.msg)[0];
        return res.status(422).json({ message: firstError });
    } else {
        if (!resetPasswordOtp, !newPassword)
            return res.status(400).json({ message: "Authentication Error!!" });

        let user = await User.findOne({ resetPasswordOtp })
        if (!user) return res.status(400).json({ message: "Wrong code. Try again." });

        const updatedFields = { password: newPassword, resetPasswordOtp: "" };
        user = _.extend(user, updatedFields);
        try {
            await user.save();
            return res.status(200).json({ message: "Great! Now you can login with new password" });
        } catch (error) {
            return res.status(400).json({ message: error });
        }
    }
}
exports.adminMiddleware = (req, res, next) => {
    User.findById({ _id: req.user._id, }).exec((err, user) => {
        if (err || !user) {
            return res.status(400).json({
                error: "User not found",
            });
        }
        if (user.role !== "admin") {
            return res.status(400).json({ error: "Admin resource. Access denied." });
        }
        req.profile = user;
        next();
    });
};

exports.requireSignin = expressJwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"], // added later
    userProperty: "auth",
});
