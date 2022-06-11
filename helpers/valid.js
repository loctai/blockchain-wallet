//validation helper

const { check } = require("express-validator");

exports.validRegister = [
    check("email").isEmail().withMessage("Must be a valid email address"),
    check("password", "Password is required").notEmpty(),
    check("password").isLength({
        min: 6,
    }).withMessage("Password must contain at least 6 characters").matches(/\d/).withMessage("Password must contain a number"),
]

exports.validLogin = [
    check("email").isEmail().withMessage("Must be a valid email address"),
    check("password", "password is required").notEmpty(),
    check("password")
        .isLength({
            min: 6,
        })
        .withMessage("Password must contain at least 6 characters")
        .matches(/\d/)
        .withMessage("password must contain a number"),
]


