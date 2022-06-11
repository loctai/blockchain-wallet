const WalletInfo = require("../models/walletInfo.modules");
const User = require("../models/auth.modules");

exports.userMiddleware = async (req, res, next) => {
    const { user_id } = req.body;
    try {
        if (!user_id)
            return res.status(420).json({ error: "User id is missing" });
            
            const user = await User.findOne({ _id: user_id });
            if (!user) return res.status(400).json({ message: `User not found` });
            
            next();
            
        } catch (error) {
        return res.status(420).json({ error: "Please provide correct email address" });
    }
}

exports.etherWalletMiddleware = async (req, res, next) => {
    const { user_id } = req.body;

    const existingWallet = await WalletInfo.findOne({ user_id: user_id });
    if (existingWallet)
        return res.status(400).json({ error: "Ether Wallet is already created" });
    next();
}

exports.transactionMiddleware = async (req, res, next) => {
    const { user_id } = req.body;
    //get wallet deail against user id
    const walletDetail = await WalletInfo.findOne({ user_id: user_id });
    if (!walletDetail)
        return res.status(400).json({ error: "Wallet is not exist" });
        req.walletDetail = walletDetail;
    next();
}