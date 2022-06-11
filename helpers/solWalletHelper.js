const SolanaWalletInfo = require("../models/solanaWalletInfo.modules");
const solanaWeb3 = require('@solana/web3.js');
const connection = new solanaWeb3.Connection("https://api.devnet.solana.com");

exports.createSolWalletByUserId = async (user_id) => {
    const keyPair = solanaWeb3.Keypair.generate();
    const publicKey = keyPair.publicKey.toString();
    const secretKey = keyPair.secretKey.toString();
    let newSolWallet = new SolanaWalletInfo({ user_id: user_id, public_key: publicKey, secret_key: secretKey });
    try {
        const saveData = await newSolWallet.save();
        var result = { "public_key": saveData.public_key, "secret_key": keyPair.secretKey }
        return { "status": 200, "data": result }
    } catch (err) {
        return { "status": 400, "error":err }
    }
}

exports.getSolWalletBalance = async (address) => {
    const balance = await connection.getBalance(address);
    return (balance / solanaWeb3.LAMPORTS_PER_SOL);
}
