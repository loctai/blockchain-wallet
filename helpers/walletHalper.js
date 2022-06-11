const WalletInfo = require("../models/walletInfo.modules");
const Web3 = require('web3');
const { getContractInstance } = require("../helpers/wallet");
const provider = "https://rinkeby.infura.io/v3/5ff17bb55b904f18bb2d50940b2ce369";
const Web3Client = new Web3(new Web3.providers.HttpProvider(provider));
const CryptoJS = require("crypto-js");


exports.createWalletByUserId = async (user_id) => {
    const web3 = new Web3
    const accountDetail = await Web3Client.eth.accounts.create();
    const walletAddress = accountDetail.address
    const privateKey = accountDetail.privateKey
    var cipherPrivateKey = CryptoJS.AES.encrypt(privateKey, process.env.ENCRYPT_SECRET_KEY).toString();
    let newWallet = new WalletInfo({ user_id: user_id, wallet_address: walletAddress, privateAddress: cipherPrivateKey });
    try {
        const saveData = await newWallet.save();
        var result = { "walletAddress": saveData.wallet_address, "privateKey": privateKey }
        return { "status": 200, "data": result }

    } catch (err) {
        return { "status": 400, "error": errorHandler(err) }
    }
}

exports.userTokenBalance = async (walletAddress) => {
    try {
        const contract = await getContractInstance();
        var balance = await contract.methods.balanceOf(walletAddress).call();
        var decimals = await contract.methods.decimals().call();
        balance = (balance / (10 ** decimals));
        var symbol = await contract.methods.symbol().call();
        return { 'status': 200, 'balance': balance.toString(), 'symbol': symbol }
    } catch (error) {
        return { 'status': 400, 'error': error }
    }
}
exports.decryptWalletPrivateKey = async (encryptPrivateKey) => {
    var bytes = CryptoJS.AES.decrypt(encryptPrivateKey, process.env.ENCRYPT_SECRET_KEY);
    var originalPrivateKey = bytes.toString(CryptoJS.enc.Utf8);
    return originalPrivateKey;
}
