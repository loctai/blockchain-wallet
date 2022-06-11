const express = require('express')
const router = express.Router()

//validation 
const {
    validRegister,
    validLogin
} = require('../helpers/valid.js')
// Load Controllers
const { registerOtpController, login, activationOTPAccount,
    resendOtp, reSendLoginOtp, loginVerification, 
    forgetPassword, restPassword } = require('../controllers/auth.controller.js')

router.post('/register', validRegister, registerOtpController)
router.post('/activation', activationOTPAccount)
router.post('/resend_otp', resendOtp)
router.post('/login', validLogin, login)
router.post('/login_verify', loginVerification)
router.post('/resend_login_otp', reSendLoginOtp)
router.post('/forget_password', forgetPassword)
router.post('/reset_password', restPassword)


module.exports = router