const WalletInfo = require("../models/walletInfo.modules");
const { validationResult } = require("express-validator");
const { errorHandler } = require("../helpers/dbErrorHandling");
const Web3 = require('web3');
const { getContractInstance } = require("../helpers/wallet");
const provider = "https://rinkeby.infura.io/v3/5ff17bb55b904f18bb2d50940b2ce369";
const Web3Client = new Web3(new Web3.providers.HttpProvider(provider));
const { createWalletByUserId, userTokenBalance, decryptWalletPrivateKey } = require('../helpers/walletHalper');

exports.createWallet = async (req, res) => {
    const { user_id } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array().map((error) => error.msg)[0];
        return res.status(422).json({ error: firstError });
    } else {
        // create ether wallet against user id
        const response = await createWalletByUserId(user_id);
        if (response.status === 400)
            return res.status(response.status).json({ error: response.status });
        // get token balance
        const tokenDetail = await userTokenBalance(walletDetail.wallet_address);
        return res.status(response.status).json({ data: { walletDetail: response.data, tokenDetail: tokenDetail }, error: '' });
    }
}


exports.getEtherFromWallet = async (req, res) => {

    const { address } = req.body;
    Web3Client.eth.getBalance(address).then(function (result) {
        const ethAmount = Web3Client.utils.fromWei(result, 'ether')
        return res.status(200).json({ eth: ethAmount });
    });
}

exports.etherTransaction = async (req, res) => {

    const { fromAddress, toAddress, amount } = req.body;

    const walletDetail = req.walletDetail;
    try {
        //get ether balance before transaction
        const ethBalance = await Web3Client.eth.getBalance(fromAddress)
        // convert amount to ether from wei
        const ethAmount = Web3Client.utils.fromWei(ethBalance, 'ether')
        //cgeck sending amount is greater then ether balance
        if (amount > ethAmount)
            return res.status(400).json({ error: `you have not enough ether to transfer "${ethAmount}"` });
        //get nonce for transaction 
        const count = await Web3Client.eth.getTransactionCount(fromAddress, 'latest')
        const nonce = Web3Client.utils.toHex(count);
        let etherValue = Web3Client.utils.toWei(amount.toString(), 'ether');
        const transaction = {
            'to': toAddress,
            'value': etherValue,
            'gas': 30000,
            'nonce': nonce,
            // optional data field to send message or execute smart contract
        };

        //get private key for transaction 
        let privateKey = await decryptWalletPrivateKey(walletDetail.privateAddress);
        //signed transaction 
        const signedTx = await Web3Client.eth.accounts.signTransaction(transaction, privateKey);
        const result = {};
        const sentTranx = await Web3Client.eth.sendSignedTransaction(signedTx.rawTransaction);
        // get transaction recepit
        result['receipt'] = sentTranx;
        return res.status(200).json(result);

    } catch (error) {
        //if any error occur it catch the error
        return res.status(400).json({ error: error });
    }
}

exports.approveToken = async (req, res) => {
    //get contract Instance
    let contract = await getContractInstance();
    const result = {};
    const { walletAddress, toAddress, ammountToApprove } = req.body;
    const walletDetail = req.walletDetail;
    try {
        // get balance of token for approval 
        var balance = await contract.methods.balanceOf(walletAddress).call();
        if (balance < 1)
            return res.status(400).json({ error: `your balance is "${balance}" you can't approved` });
        // get private key for transaction
        let privateKey = await decryptWalletPrivateKey(walletDetail.privateAddress);

        var amount = ammountToApprove //7000000;
        //convert amount to approved in to wei
        let approveAmount = Web3Client.utils.toWei(amount.toString(), 'ether');
        const data = contract.methods.approve(toAddress, approveAmount).encodeABI();
        //make raw transaction
        var rawTransaction = await makeRawTransaction(data, walletAddress)
        Web3Client.eth.accounts.wallet.add(privateKey);
        const sentTx = await Web3Client.eth.sendTransaction(rawTransaction);
        //get transaction recepit 
        result['receipt'] = sentTx;
        return res.status(200).json(result);

    } catch (err) {
        return res.status(400).json({ error: err });
    }
}

exports.getTokenBalance = async (req, res) => {
    //get token balance
    const { walletAddress } = req.body;
    const data = await userTokenBalance(walletAddress);
    if (data.status === 200) {
        return res.status(data.status).json({ data: data, error: '' });
    } else {
        return res.status(data.status).json({ error: data.error });
    }
}
const getGasLimit = async (senderWalletAddress, nonce, data) => {
    // calculate gas limit for transaction
    var gaseLimit = await Web3Client.eth.estimateGas({
        "from": senderWalletAddress,
        "nonce": nonce,
        "to": process.env.CONTRACT_ADDRESS,
        "data": data
    });
    return gaseLimit;
}
exports.checkAllowedToken = async (req, res) => {

    const { ownerWalletAddress, delegateWalletAddress } = req.body;
    let contract = await getContractInstance();
    // check allowance
    const allow = await contract.methods.allowance(ownerWalletAddress, delegateWalletAddress).call();
    // convert allowed token from wei
    var allowedToken = Web3Client.utils.fromWei(allow, "ether")
    return res.status(200).json({ data: { allowedToken: allowedToken }, error: '' });
}

exports.transferToken = async (req, res) => {
    const result = {};
    let contract = await getContractInstance();
    const { user_id, walletAddress, receiverAddress, numTokens } = req.body;
    const walletDetail = req.walletDetail;
    try {
        //get token balance before transaction 
        let balance = await contract.methods.balanceOf(walletAddress).call();
        //get token decimals 
        var decimals = await contract.methods.decimals().call();
        balance = (balance / (10 ** decimals));
        console.log("🚀 ~ file: ether.controller.js ~ line 151 ~ exports.transferToken= ~ balance", balance)
        // check sending token is avalable 
        if (numTokens > balance)
            return res.status(400).json({ error: `your balance is "${balance}" you cant proceed this transaction` });
        //get private key for transaction 
        let privateKey = await decryptWalletPrivateKey(walletDetail.privateAddress);

        // //convert token to wei
         let convertedNumTokens = Web3Client.utils.toWei(numTokens.toString());
        // // make data for transfer
         const data = contract.methods.transfer(receiverAddress, convertedNumTokens).encodeABI();
         //make raw transaction 
         var rawTransaction = await makeRawTransaction(data, walletAddress)
        // // add private key for transaction 
         await Web3Client.eth.accounts.wallet.add(privateKey);
         const sentTranx = await Web3Client.eth.sendTransaction(rawTransaction);
        //transaction receipt
        result['receipt'] = sentTranx;
        return res.status(200).json(result);
    } catch (error) {
    console.log("🚀 ~ file: ether.controller.js ~ line 171 ~ exports.transferToken= ~ error", error)

        return res.status(400).json({ error: error });
    }
}
const makeRawTransaction = async (data, senderWalletAddress) => {
console.log("🚀 ~ file: ether.controller.js ~ line 182 ~ makeRawTransaction ~ senderWalletAddress", senderWalletAddress)

    // Determine the nonce
    const count = await Web3Client.eth.getTransactionCount(senderWalletAddress)
    // How many tokens do I have before sending?
    const nonce = Web3Client.utils.toHex(count);
    console.log("🚀 ~ file: ether.controller.js ~ line 180 ~ makeRawTransaction ~ nonce", nonce)
    var gaseLimitForTransaction = await getGasLimit(senderWalletAddress, nonce, data)
    console.log("🚀 ~ file: ether.controller.js ~ line 153 ~ makeRawTransaction ~ gaseLimitForTransaction", gaseLimitForTransaction)
    const gasLimit = Web3Client.utils.toHex(gaseLimitForTransaction);
    const gasPrice = Web3Client.utils.toHex(Web3Client.eth.gasPrice || Web3Client.utils.toHex(2 * 1e9));
    const value = Web3Client.utils.toHex(Web3Client.utils.toWei('0', 'wei'));

    // Chain ID of Ropsten Test Net is 3, replace it to 1 for Main Net
    var chainId = 4;
    var rawTransaction = {
        "from": senderWalletAddress,
        "nonce": nonce,
        "gasPrice": gasPrice,
        "gasLimit": gasLimit,
        "to": process.env.CONTRACT_ADDRESS,
        "value": value,
        "data": data,
        "chainId": chainId
    };
    return rawTransaction;
}

exports.decryptPrivateKey = async (req, res) => {

    const walletDetail = req.walletDetail;
    // decrypt private key to show user
    var originalPrivateKey = await decryptWalletPrivateKey(walletDetail.privateAddress);
    return res.status(200).json({ data: { privateKey: originalPrivateKey }, error: '' });

}

exports.gasEstimateForEthTrans = async (req, res) => {
    const { fromAddress, toAddress, amount } = req.body;
    try {
        const count = await Web3Client.eth.getTransactionCount(fromAddress, 'latest')
        const nonce = Web3Client.utils.toHex(count);
        let etherValue = Web3Client.utils.toWei(amount.toString(), 'ether');
        const transaction = {
            'to': toAddress,
            'value': etherValue,
            'nonce': nonce,
        };
        const estimate = await Web3Client.eth.estimateGas(transaction);

        const estimatePrice = (estimate / 10 ** 9);

        return res.status(200).json({ estimatedGasFee: estimatePrice });

    } catch (error) {
        console.log("🚀 ~ file: ether.controller.js ~ line 230 ~ exports.gasPriceForEthTrans= ~ error", error)
        return res.status(400).json({ error: error });

    }
}

exports.gasEstimateForTokenTrans = async (req, res) => {
    let contract = await getContractInstance();
    const { walletAddress, receiverAddress, numTokens } = req.body;
    try {
        //convert token to wei
        let convertedNumTokens = Web3Client.utils.toWei(numTokens.toString(), 'ether');
        // make data for transfer
        const data = contract.methods.transfer(receiverAddress, convertedNumTokens).encodeABI();
        // Determine the nonce
        const count = await Web3Client.eth.getTransactionCount(walletAddress)
        // How many tokens do I have before sending?
        const nonce = Web3Client.utils.toHex(count);
        var gaseLimit = await getGasLimit(walletAddress, nonce, data)
        console.log("🚀 ~ file: ether.controller.js ~ line 250 ~ exports.gasEstimateForTokenTrans= ~ gaseLimit", gaseLimit)
        const estimatePrice = (gaseLimit / 10 ** 9);
        return res.status(200).json({ estimatedGasFee: estimatePrice });

    } catch (error) {
        console.log("🚀 ~ file: ether.controller.js ~ line 255 ~ exports.gasEstimateForTokenTrans= ~ error", error)
        return res.status(400).json({ error: error });
    }
}
const axios = require('axios');
exports.etherTransactionHistory = async (req, res) => {
    const { walletAddress } = req.body;
    let wallet = walletAddress.toLowerCase();
    //const walletAddress = '0x96c972570df88a6b5bfeb3ff72cf8f812eb93c09';
    //const apiKey = 'HQY9PBIDZPRKGW1Q3FXKKFSFPBFRXDIJM7'
    //const baseurl = 'https://api-rinkeby.etherscan.io';
    let receivedArray = [];
    let sendArray = [];
    try {
        const api = `${process.env.ETHERSACN_API_URL}/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=50&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY}`;
        const response = await axios.get(api);
        if (response.data.status === '1') {
            const transaction = response.data.result;
            if (transaction) {

                transaction.forEach(trans => {
                    if (trans.txreceipt_status === '1' && trans.contractAddress === '') {
                        var total = 0;
                        var amount = Web3Client.utils.fromWei(trans.value, "ether")
                        var amountGwei = Web3Client.utils.fromWei(trans.value, "gwei")
                        var gasPrice = Web3Client.utils.fromWei(trans.gasPrice, "gwei")
                        var date = new Date(trans.timeStamp * 1000).toISOString()
                        var totalGasUsed = trans.gas * gasPrice
                        totalGasUsed = Math.round(totalGasUsed);

                        var total = (Number(amountGwei) + Number(totalGasUsed))
                        total = (total / 10 ** 9)

                        if (trans.to === wallet) {
                            let receivedData
                            receivedData = {
                                "date": date, "from": trans.from, "to": trans.to, "gasLimit": trans.gas, "gasPrice": gasPrice,
                                "nonce": trans.nonce, "amount": amount, "total": total
                            };
                            receivedArray.push(receivedData)
                        } else {
                            let sendData
                            sendData = {
                                "date": date, "from": trans.from, "to": trans.to, "gasLimit": trans.gas, "gasPrice": gasPrice,
                                "nonce": trans.nonce, "amount": amount, "total": total
                            };
                            sendArray.push(sendData)
                        }

                    }
                });

                return res.status(200).json({ receivedEth: receivedArray, sendEth: sendArray });
            } else {
                return res.status(200).json({ receivedEth: [], sendEth: [], message: 'Data not found' });
            }
        } else {

            return res.status(200).json({ receivedEth: [], sendEth: [], message: response.data.message });
        }
    } catch (error) {
        console.log("🚀 ~ file: ether.controller.js ~ line 309 ~ exports.etherTransactionHistory= ~ error", error)
        return res.status(400).json({ error: error });
    }
}
const CoinGecko = require('coingecko-api');
exports.convertCryptoToUSD = async (req, res) => {
    const { currency, symbol } = req.body;
    try {
        const CoinGeckoClient = new CoinGecko();
        let data = await CoinGeckoClient.exchanges.fetchTickers('bitfinex', {
            coin_ids: [currency]
        });
        var _coinList = {};
        var _datacc = data.data.tickers.filter(t => t.target == 'USD');
        [symbol].forEach((i) => {
            var _temp = _datacc.filter(t => t.base == i);
            var _res = _temp.length == 0 ? [] : _temp[0];
            _coinList[i] = _res.last;
        })
        console.log("🚀 ~ file: ether.controller.js ~ line 331 ~ exports.convertCryptoToUSD= ~ _coinList", _coinList)
        return res.status(200).json(_coinList);

    } catch (error) {
        console.log("🚀 ~ file: ether.controller.js ~ line 333 ~ exports.convertCryptoToUSD= ~ error", error)
        return res.status(400).json({ error: error });
    }
}


exports.etherContract = async (req, res) => {

    // const CoinGeckoClient = new CoinGecko();
    // let data = await CoinGeckoClient.exchanges.fetchTickers('bitfinex', {
    //     coin_ids: ['solana']
    // });
    // var _coinList = {};
    // var _datacc = data.data.tickers.filter(t => t.target == 'USD');
    // ['SOL'].forEach((i) => {
    //     var _temp = _datacc.filter(t => t.base == i);
    //     var _res = _temp.length == 0 ? [] : _temp[0];
    //     _coinList[i] = _res.last;
    // })
    // console.log(_coinList);
}
