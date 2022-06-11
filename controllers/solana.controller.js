const SolanaWalletInfo = require("../models/solanaWalletInfo.modules");
const solanaWeb3 = require('@solana/web3.js');
const { validationResult } = require("express-validator");
const { createSolWalletByUserId, getSolWalletBalance } = require('../helpers/solWalletHelper');
const connection = new solanaWeb3.Connection("https://api.devnet.solana.com");

exports.createSolanaWallet = async (req, res) => {
    const { user_id } = req.body;
    if (!user_id)
        return res.status(420).json({ error: "User id is missing" });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array().map((error) => error.msg)[0];
        return res.status(422).json({ error: firstError });
    } else {
        const existingSolWallet = await SolanaWalletInfo.findOne({ user_id: user_id });
        if (existingSolWallet)
            return res.status(400).json({ error: "Solana Wallet is already created" });
        const response = await createSolWalletByUserId(user_id);
        if (response.status === 400)
            return res.status(response.status).json({ error: response.status });

        return res.status(response.status).json({ data: response.data, error: '' });
    }

}

exports.sendSolTransaction = async (req, res) => {
    const { user_id, amount, toAddress } = req.body;
    if (!user_id)
        return res.status(420).json({ error: "User id is missing" });

    const solWalletDetail = await SolanaWalletInfo.findOne({ user_id: user_id });
    if (!solWalletDetail)
        return res.status(400).json({ error: "Sol Wallet is not exist" });
    const secretKeyString = solWalletDetail.secret_key;
    const usingSplit = secretKeyString.split(',');
    const secret_key = Uint8Array.from(usingSplit)
    try {
        const recieverWallet = new solanaWeb3.PublicKey(toAddress);

        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
        var from = solanaWeb3.Keypair.fromSecretKey(secret_key)

        const solBalance = await getSolWalletBalance(from.publicKey)
        console.log("🚀 ~ file: solana.controller.js ~ line 45 ~ exports.sendSolTransaction= ~ solBalance", solBalance)
        if (amount > solBalance)
            return res.status(400).json({ error: `you have not enough Sol to transfer "${solBalance}"` });

        const amountInLamports = amount * solanaWeb3.LAMPORTS_PER_SOL;

        // Add transfer instruction to transaction
        var transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: recieverWallet,
                lamports: amountInLamports
            })
        );
        //console.log("🚀 ~ file: solana.controller.js ~ line 58 ~ exports.sendSolTransaction= ~ transaction", transaction)

        // Sign transaction, broadcast, and confirm
        var signature = await solanaWeb3.sendAndConfirmTransaction(
            connection,
            transaction,
            [from]
        );
        return res.status(200).json({ transactionHash: signature });
    } catch (error) {
        console.log("🚀 ~ file: solana.controller.js ~ line 70 ~ exports.sendSolTransaction= ~ error", error)
        return res.status(400).json({ error: error });
    }
}

exports.solAccountBalance = async (req, res) => {
    const { walletAddress } = req.body;
    try {
        //const wallet = new solanaWeb3.PublicKey("7J7kQikTXTSiuUWzmwcbAaWR7S9Y9KtDKcSjo1Qnt51h");
        const wallet = new solanaWeb3.PublicKey(walletAddress);
        const accountInfo = await connection.getBalance(wallet)
        const balance = accountInfo / solanaWeb3.LAMPORTS_PER_SOL
        console.log("🚀 ~ file: solana.controller.js ~ line 77 ~ exports.solAccountInfo= ~ balance", balance)

        return res.status(200).json({ balance: balance });

    } catch (error) {

    }
}

exports.getSolanaSecretKey = async (req, res) => {
    const { user_id } = req.body;
    if (!user_id)
        return res.status(420).json({ error: "User id is missing" });

    const solWalletDetail = await SolanaWalletInfo.findOne({ user_id: user_id });
    if (!solWalletDetail)
        return res.status(400).json({ error: "Solana Wallet is not exist" });

    const keyString = solWalletDetail.secret_key;
    const splitKeyString = keyString.split(',');
    const secretKey = Uint8Array.from(splitKeyString);
    console.log("🚀 ~ file: solana.controller.js ~ line 100 ~ exports.getSolanaSecretKey= ~ secretKey", secretKey)

    return res.status(200).json({ data: { secretKey }, error: '' });
}