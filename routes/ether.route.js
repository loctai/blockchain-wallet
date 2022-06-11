const express = require('express')
const router = express.Router();

const { createWallet, etherTransaction, etherContract, getEtherFromWallet,
    decryptPrivateKey, getTokenBalance, approveToken, checkAllowedToken,
    transferToken, gasEstimateForEthTrans, gasEstimateForTokenTrans,
    etherTransactionHistory, convertCryptoToUSD } = require('../controllers/ether.controller.js')
const { userMiddleware, etherWalletMiddleware, transactionMiddleware } = require('../middleware/userWalletMiddleware.js')
const { swapEtherToToken, swapTokenToEther, swapTokenToToken,
    etherToTokenPrice, tokenToEtherPrice } = require('../controllers/uniswap.controller.js');

router.post('/create_wallet', userMiddleware, etherWalletMiddleware, createWallet)
router.post('/get_balance', userMiddleware, getEtherFromWallet)
router.post('/ether_transaction', userMiddleware, transactionMiddleware, etherTransaction)
router.post('/estimated_gas_fee', userMiddleware, transactionMiddleware, gasEstimateForEthTrans)
router.post('/ether_transaction_history', userMiddleware, transactionMiddleware, etherTransactionHistory)
router.post('/convert_to_usd', convertCryptoToUSD)

router.post('/estimated_token_gas_fee', userMiddleware, transactionMiddleware, gasEstimateForTokenTrans)
router.post('/approve_token', userMiddleware, transactionMiddleware, approveToken)
router.post('/token_transfer', userMiddleware, transactionMiddleware, transferToken)
router.post('/get_token_balanace', userMiddleware, getTokenBalance)
router.post('/get_private_key', userMiddleware, transactionMiddleware, decryptPrivateKey)

//swaping routes
router.post('/ether_token_transaction_detail', userMiddleware, transactionMiddleware, etherToTokenPrice)
router.post('/token_ether_swap_detail', userMiddleware, transactionMiddleware, tokenToEtherPrice)

router.post('/swap_ether_to_token', userMiddleware, transactionMiddleware, swapEtherToToken)
router.post('/swap_token_to_ether', userMiddleware, transactionMiddleware, swapTokenToEther)
router.post('/swap_token_to_token', userMiddleware, transactionMiddleware, swapTokenToToken)

router.post('/ether_contract', etherContract)

router.post('/check_allowance', checkAllowedToken)



module.exports = router