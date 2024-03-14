"use strict";

import { BackpackClient } from "./backpack_client.js";

/// EDIT ///
const API_KEY = "0hnpbVxxxxxxxxxxxOg=";
const API_SECRET = "sG2xxxxxxxxxxxxxxxdQoc=";
const MAX_VOLUME = 111000;
const SWAP_VOLUME = [100, 220];
/////////////

const wait = async (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

const getNowFormatDate = () => {
    const date = new Date();
    const seperator1 = "-";
    const seperator2 = ":";
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const strDate = date.getDate().toString().padStart(2, "0");
    const strHour = date.getHours().toString().padStart(2, "0");
    const strMinute = date.getMinutes().toString().padStart(2, "0");
    const strSecond = date.getSeconds().toString().padStart(2, "0");
    const currentdate = `${date.getFullYear()}${seperator1}${month}${seperator1}${strDate} ${strHour}${seperator2}${strMinute}${seperator2}${strSecond}`;
    return currentdate;
};

let successBuy = 0;
let sellBuy = 0;
let cancelJob = false;
let buyFlag = true;
let totalVolume = 0;

const init = async (client) => {
    try {
        if (cancelJob) {
            console.log(getNowFormatDate(), "Job canceled");
            return;
        }

        console.log("\n============================");
        console.log(`Total Buy: ${successBuy} | Total Sell: ${sellBuy} | Total Volume: ${totalVolume} USDC`);
        console.log("============================\n");

        console.log(getNowFormatDate(), "Waiting 10 seconds...");
        await wait(10000);

        const userBalance = await client.Balance();
        const usdcTradeAvailable = randomFloat(SWAP_VOLUME[0], SWAP_VOLUME[1]);

        if (userBalance.USDC.available < usdcTradeAvailable) {
            console.log("Not enough USDC balance!");
            cancelJob = true;
            return;
        }

        if (totalVolume > MAX_VOLUME) {
            console.log("Job done!");
            cancelJob = true;
            return;
        }

        if (buyFlag) {
            await buyFun(client, usdcTradeAvailable);
        } else {
            await sellFun(client);
            return;
        }
    } catch (error) {
        console.log(getNowFormatDate(), `Try again... (${error.message})`);
        console.log("=======================");

        await wait(3000);
        init(client);
    }
};

const random = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomFloat = (min, max) => {
    return Math.random() * (max - min) + min;
};

const sellFun = async (client) => {
    try {
        const openOrders = await client.GetOpenOrders({ symbol: "SOL_USDC" });

        if (openOrders.length > 0) {
            await client.CancelOpenOrders({ symbol: "SOL_USDC" });
            console.log(getNowFormatDate(), "All pending orders canceled");
        }

        const userBalance = await client.Balance();
        console.log(getNowFormatDate(), `My Account Infos: ${userBalance.SOL.available} $SOL | ${userBalance.USDC.available} $USDC`);

        const { lastPrice: lastPriceAsk } = await client.Ticker({ symbol: "SOL_USDC" });
        console.log(getNowFormatDate(), "Price sol_usdc:", lastPriceAsk);

        let quantitys = (userBalance.SOL.available - 0.02).toFixed(2).toString();
        
        if (Number.parseFloat(quantitys) < 0.01 || Number.parseFloat(userBalance.SOL.available) < 0.02) {
            buyFlag = true;
            throw new Error("Sell not enough SOL balance");
        }

        console.log(getNowFormatDate(), `Trade... ${quantitys} $SOL to ${(lastPriceAsk * quantitys).toFixed(2)} $USDC`);
        
        const orderResultAsk = await client.ExecuteOrder({
            orderType: "Limit",
            price: (lastPriceAsk - 0.1).toFixed(2).toString(),
            quantity: quantitys,
            side: "Ask",
            symbol: "SOL_USDC"
        });

        if (orderResultAsk?.status === "Filled" && orderResultAsk?.side === "Ask") {
            sellBuy += 1;
            console.log(getNowFormatDate(), "Sold successfully:", `Order number:${orderResultAsk.id}`);
            totalVolume += parseFloat(lastPriceAsk * quantitys);
            buyFlag = true;
            init(client);
        } else {
            if (orderResultAsk?.status === 'Expired') {
                throw new Error("Sell Order Expired");
            } else {
                throw new Error(orderResultAsk?.status);
            }
        }
    } catch (error) {
        console.log(getNowFormatDate(), `Error in selling: ${error.message}`);
        console.log("=======================");
    }
};

const buyFun = async (client, usdc) => {
    try {
        const openOrders = await client.GetOpenOrders({ symbol: "SOL_USDC" });

        if (openOrders.length > 0) {
            await client.CancelOpenOrders({ symbol: "SOL_USDC" });
            console.log(getNowFormatDate(), "All pending orders canceled");
        }

        const userBalance = await client.Balance();
        const balanceSol = userBalance.SOL ? userBalance.SOL.available : 0;

        console.log(getNowFormatDate(), `My Account Infos: ${balanceSol} $SOL | ${userBalance.USDC.available} $USDC`,);

        const { lastPrice } = await client.Ticker({ symbol: "SOL_USDC" });
        console.log(getNowFormatDate(), "Price of sol_usdc:", lastPrice);

        const quantitys = (usdc / lastPrice).toFixed(2).toString();
        console.log(getNowFormatDate(), `Trade ... ${(usdc).toFixed(2).toString()} $USDC to ${quantitys} $SOL`);

        const orderResultBid = await client.ExecuteOrder({
            orderType: "Limit",
            price: (lastPrice + 0.1).toFixed(2).toString(),
            quantity: quantitys,
            side: "Bid",
            symbol: "SOL_USDC"
        });

        buyFlag = false;

        if (orderResultBid?.status === "Filled" && orderResultBid?.side === "Bid") {
            successBuy += 1;
            console.log(getNowFormatDate(), "Bought successfully:", `Order number: ${orderResultBid.id}`);
            console.log(getNowFormatDate(), "Begin wait", `Next order number`);
            totalVolume += usdc;
            await wait(random(5, 10) * 1000);
            console.log(getNowFormatDate(), "End wait", `Next order ...`);
            init(client);
        } else {
            if (orderResultBid?.status === 'Expired') {
                throw new Error("Buy Order Expired");
            } else {
                throw new Error(orderResultBid?.status);
            }
        }
    } catch (error) {
        console.log(getNowFormatDate(), `Error in buying: ${error.message}`);
        console.log("=======================");
    }
};

(async () => {
    const apiSecret = API_SECRET;
    const apiKey = API_KEY;
    const client = new BackpackClient(apiSecret, apiKey);
    init(client);
})();
