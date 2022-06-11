const express = require('express')
const router = express.Router();

const { createSolanaWallet, sendSolTransaction, solAccountBalance,
    getSolanaSecretKey } = require('../controllers/solana.controller.js');

router.post('/create_sol_wallet', createSolanaWallet);
router.post('/send_sol_transaction', sendSolTransaction);
router.post('/sol_account_balance', solAccountBalance);
router.post('/get_solana_secret_key', getSolanaSecretKey);

module.exports = router