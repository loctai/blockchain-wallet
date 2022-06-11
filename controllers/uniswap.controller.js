const WalletInfo = require("../models/walletInfo.modules");
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const ethers = require('ethers');
const fs = require('fs');
const { decryptWalletPrivateKey } = require('../helpers/walletHalper');
const providerEth = ethers.getDefaultProvider('rinkeby', {
    infura: 'https://rinkeby.infura.io/v3/5ff17bb55b904f18bb2d50940b2ce369'
});
const routerAbi = JSON.parse(fs.readFileSync('uniswapV2Router02.json'));

exports.etherToTokenPrice = async (req, res) => {
    const { etherAmount } = req.body;
    try {
        // chain id for test net
        const chainId = ChainId.RINKEBY;
        //token address to swap 
        const tokenAddress = process.env.SWAP_TOKEN_ADDRESS;
        var amount = ethers.utils.parseEther(String(etherAmount));
        //fetch token data
        const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
        //fetch ether through chain id
        const weth = WETH[chainId];
        //fetching pair data for swap ether to token
        const pair = await Fetcher.fetchPairData(swapToken, weth);
        const route = new Route([pair], weth);
        const trade = new Trade(route, new TokenAmount(weth, String(amount)), TradeType.EXACT_INPUT)
        const tokenPriceInEth = route.midPrice.invert().toSignificant(6);
        const tokenPrice = route.midPrice.toSignificant(6);
        let finalPrice = etherAmount * tokenPrice;
        let executionPrice = trade.executionPrice.toSignificant(6)
        finalPrice = Math.round((finalPrice + Number.EPSILON) * 100) / 100;

        console.log("1 token = ", tokenPriceInEth)
        console.log("total token by given by eth= ", finalPrice)
        console.log("Minimum received= ", executionPrice * etherAmount)

        const minimumReceived = executionPrice * etherAmount
        const result = { tokenPriceInEth: tokenPriceInEth, tokenCalculate: finalPrice, minimumReceived: minimumReceived }
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ error: error.reason });
    }
}

exports.tokenToEtherPrice = async (req, res) => {
    const { tAmount } = req.body;
    try {
        const chainId = ChainId.RINKEBY;
        const tokenAddress = process.env.SWAP_TOKEN_ADDRESS;
        const amountIn = ethers.utils.parseEther(tAmount.toString());

        const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
        const weth = WETH[chainId];
        const pair = await Fetcher.fetchPairData(weth, swapToken);
        const route = new Route([pair], swapToken);
        const trade = new Trade(route, new TokenAmount(swapToken, amountIn.toString()), TradeType.EXACT_INPUT)

        const ethPriceInToken = route.midPrice.invert().toSignificant(6);
        const ethPrice = route.midPrice.toSignificant(6);
        let finalPrice = tAmount * ethPrice;
        let executionPrice = trade.executionPrice.toSignificant(6)
        //finalPrice = Math.round((finalPrice + Number.EPSILON) * 100) / 100;

        console.log("1 Eth = ", ethPriceInToken)
        console.log("total eth by given by token= ", finalPrice)
        console.log("Minimum received= ", executionPrice * tAmount)

        const minimumReceived = executionPrice * tAmount
        const result = { ethPriceInToken: ethPriceInToken, ethCalculate: finalPrice, minimumReceived: minimumReceived }
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ error: error.reason });
    }
}
exports.swapEtherToToken = async (req, res) => {
    const { walletAddress, etherAmount } = req.body;

    const walletDetail = req.walletDetail;
    // chain id for test net
    const chainId = ChainId.RINKEBY;
    //token address to swap 
    const tokenAddress = process.env.SWAP_TOKEN_ADDRESS;
    var amount = ethers.utils.parseEther(String(etherAmount));
    //fetch token data
    const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
    //fetch ether through chain id
    const weth = WETH[chainId];
    //fetching pair data for swap ether to token
    const pair = await Fetcher.fetchPairData(swapToken, weth);
    const route = new Route([pair], weth);
    const trade = new Trade(route, new TokenAmount(weth, String(amount)), TradeType.EXACT_INPUT)
    console.log(route.midPrice.toSignificant(6))
    console.log(route.midPrice.invert().toSignificant(6))
    console.log(trade.executionPrice.toSignificant(6))
    console.log(trade.nextMidPrice.toSignificant(6))
    //set Tolerance 0.5%
    const slippageTolerance = new Percent('50', "10000"); //10 bips 1 bip = 0.001%
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
    //set path of token and ether
    const path = [weth.address, swapToken.address];
    const to = walletAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const value = trade.inputAmount.raw;

    let privateKey = await decryptWalletPrivateKey(walletDetail.privateAddress);
    const singer = new ethers.Wallet(privateKey);

    const account = singer.connect(providerEth);
    const uniswap = new ethers.Contract(process.env.UniswapV2Router02_ADDRESS, routerAbi,
        account);
    try {
        const tx = await uniswap.swapExactETHForTokens(
            String(amountOutMin),
            path,
            to,
            deadline,
            { value: String(value), gasPrice: 20e9 }
        );
        console.log(`Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        const result = {};
        result['receipt'] = receipt;
        return res.status(200).json({ transactionHash: tx.hash });

    } catch (error) {
        console.log("🚀 ~ file: uniswap.controller.js ~ line 95 ~ exports.swapEtherToToken= ~ error", error)
        return res.status(400).json({ error: error.reason });
    }
}
exports.swapTokenToEther = async (req, res) => {

    const { walletAddress, tAmount } = req.body;
    const walletDetail = req.walletDetail;

    const chainId = ChainId.RINKEBY;
    const tokenAddress = process.env.SWAP_TOKEN_ADDRESS;
    const amountIn = ethers.utils.parseEther(tAmount.toString());

    const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
    const weth = WETH[chainId];
    const pair = await Fetcher.fetchPairData(weth, swapToken);
    const route = new Route([pair], swapToken);
    const trade = new Trade(route, new TokenAmount(swapToken, amountIn.toString()), TradeType.EXACT_INPUT)

    console.log("Mid Price DAI --> WETH:", route.midPrice.toSignificant(6));
    console.log("Mid Price WETH --> DAI:", route.midPrice.invert().toSignificant(6));
    console.log("-".repeat(45));
    console.log("Execution Price DAI --> WETH:", trade.executionPrice.toSignificant(6));
    console.log("Mid Price after trade DAI --> WETH:", trade.nextMidPrice.toSignificant(6));


    const slippageTolerance = new Percent('50', "10000"); //10 bips 1 bip = 0.001%
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
    const path = [swapToken.address, weth.address];
    const to = walletAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    let privateKey = await decryptWalletPrivateKey(walletDetail.privateAddress);
    const singer = new ethers.Wallet(privateKey);

    const account = singer.connect(providerEth);
    const uniswap = new ethers.Contract(process.env.UniswapV2Router02_ADDRESS, routerAbi,
        account);

    try {
        const tx = await uniswap.swapExactTokensForETH(
            amountIn.toString(),
            amountOutMin.toString(),
            path,
            to,
            deadline,
            { gasPrice: 20e9, gasLimit: 1000000 }
        );

        console.log(`Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        return res.status(200).json({ transactionHash: tx.hash });

    } catch (error) {
        console.log(error)
        return res.status(400).json({ error: error.reason });
    }
}

exports.swapTokenToToken = async (req, res) => {
    const { walletAddress, tAmount } = req.body;

    const walletDetail = req.walletDetail;
    const chainId = ChainId.RINKEBY;

    const swapTokenFrom = process.env.SWAP_TOKEN_ADDRESS;
    const SwapTokenTo = process.env.SWAP_TOKEN_ADDRESS2;
    const amountIn = ethers.utils.parseEther(tAmount.toString());

    const swapTokenF = await Fetcher.fetchTokenData(chainId, swapTokenFrom);
    const swapTokenT = await Fetcher.fetchTokenData(chainId, SwapTokenTo);

    const pair = await Fetcher.fetchPairData(swapTokenF, swapTokenT);
    const route = new Route([pair], swapTokenF);
    const trade = new Trade(route, new TokenAmount(swapTokenF, amountIn.toString()), TradeType.EXACT_INPUT);

    console.log("Mid Price swapTokenFrom --> SwapTokenTo:", route.midPrice.toSignificant(6));
    console.log("Mid Price SwapTokenTo --> swapTokenFrom:", route.midPrice.invert().toSignificant(6));
    console.log("-".repeat(45));
    console.log("Execution Price swapTokenFrom --> SwapTokenTo:", trade.executionPrice.toSignificant(6));
    console.log("Mid Price after trade swapTokenFrom --> SwapTokenTo:", trade.nextMidPrice.toSignificant(6));


    const slippageTolerance = new Percent('50', "10000"); //10 bips 1 bip = 0.001%
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
    const path = [swapTokenF.address, swapTokenT.address];
    const to = walletAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    let privateKey = await decryptWalletPrivateKey(walletDetail.privateAddress);
    const singer = new ethers.Wallet(privateKey);

    const account = singer.connect(providerEth);
    const uniswap = new ethers.Contract(process.env.UniswapV2Router02_ADDRESS, routerAbi,
        account);

    try {
        const tx = await uniswap.swapExactTokensForTokens(
            amountIn.toString(),
            amountOutMin.toString(),
            path,
            to,
            deadline,
            { gasPrice: 20e9, gasLimit: 1000000 }
        );

        console.log(`Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        return res.status(200).json({ data: receipt, error: '' });

    } catch (error) {
        console.log(error.reason)
        return res.status(400).json({ error: error.reason });
    }

}