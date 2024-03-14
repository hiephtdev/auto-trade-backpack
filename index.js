"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backpack_client_1 = require("./backpack_client");

/// EDIT HERE ///
const API_KEY = "SxxxxxxTc="
const API_SECRET = "Bxxxxxxxg="
const MAX_VOLUME = 111000
const SWAP_VOLUME = [100,220]
/////////////

const wait = async (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function getNowFormatDate() {
    var date = new Date();
    var seperator1 = "-";
    var seperator2 = ":";
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    var strHour = date.getHours();
    var strMinute = date.getMinutes();
    var strSecond = date.getSeconds();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    if (strHour >= 0 && strHour <= 9) {
        strHour = "0" + strHour;
    }
    if (strMinute >= 0 && strMinute <= 9) {
        strMinute = "0" + strMinute;
    }
    if (strSecond >= 0 && strSecond <= 9) {
        strSecond = "0" + strSecond;
    }
    var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
        + " " + strHour + seperator2 + strMinute
        + seperator2 + strSecond;
    return currentdate;
}

let successbuy = 0;
let sellbuy = 0;
let cancelJob = false;
let buyFlag = true;
let totalVolume = 0;
const init = async (client) => {
    try {
        if (cancelJob) {
            console.log(getNowFormatDate(), "Job canceled");
            return;
        }
        console.log("\n============================")
        console.log(`Total Buy: ${successbuy} | Total Sell: ${sellbuy} | Total Volume: ${totalVolume} USDC`);
        console.log("============================\n")

        console.log(getNowFormatDate(), "Waiting 10 seconds...");
        await wait(10000);

        let userbalance = await client.Balance();
        let usdcTradeAvailable = randomFloat(SWAP_VOLUME[0], SWAP_VOLUME[1]);
        if (userbalance.USDC.available < usdcTradeAvailable) {
            console.log("Not enough USDC balance!")
            cancelJob = true;
            return;
        }
        if (totalVolume > MAX_VOLUME) {
            console.log("Job done!")
            cancelJob = true;
            return;
        }
        if (buyFlag) {
            await buyfun(client, usdcTradeAvailable);
        } else {
            await sellfun(client);
            return;
        }
    } catch (e) {
        console.log(getNowFormatDate(), `Try again... (${e.message})`);
        console.log("=======================")

        await wait(3000);
        init(client);

    }
}

const random = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const randomFloat = (min, max) => {
    return Math.random() * (max - min) + min;
}

const sellfun = async (client) => {
    let GetOpenOrders = await client.GetOpenOrders({ symbol: "SOL_USDC" });
    if (GetOpenOrders.length > 0) {
        let CancelOpenOrders = await client.CancelOpenOrders({ symbol: "SOL_USDC" });
        console.log(getNowFormatDate(), "All pending orders canceled");
    }

    let userbalance = await client.Balance();
    console.log(getNowFormatDate(), `My Account Infos: ${userbalance.SOL.available} $SOL | ${userbalance.USDC.available} $USDC`,);

    let { lastPrice: lastPriceask } = await client.Ticker({ symbol: "SOL_USDC" });
    console.log(getNowFormatDate(), "Price sol_usdc:", lastPriceask);
    let quantitys = (userbalance.SOL.available - 0.02).toFixed(2).toString();
    if (Number.parseFloat(quantitys) < 0.01 || Number.parseFloat(userbalance.SOL.available) < 0.02) {
        buyFlag = true;
        throw new Error("Sell not enough SOL balance");
    }
    console.log(getNowFormatDate(), `Trade... ${quantitys} $SOL to ${(lastPriceask * quantitys).toFixed(2)} $USDC`);
    let orderResultAsk = await client.ExecuteOrder({
        orderType: "Limit",
        price: (lastPriceask - 0.1).toFixed(2).toString(),
        quantity: quantitys,
        side: "Ask",
        symbol: "SOL_USDC"
    })
    if (orderResultAsk?.status == "Filled" && orderResultAsk?.side == "Ask") {
        sellbuy += 1;
        console.log(getNowFormatDate(), "Sold successfully:", `Order number:${orderResultAsk.id}`);
        totalVolume += parseFloat(lastPriceask * quantitys);
        buyFlag = true;
        init(client);
    } else {
        if (orderResultAsk?.status == 'Expired') {
            throw new Error("Sell Order Expired");
        } else {

            throw new Error(orderResultAsk?.status);
        }
    }
}

const buyfun = async (client, usdc) => {
    let GetOpenOrders = await client.GetOpenOrders({ symbol: "SOL_USDC" });
    if (GetOpenOrders.length > 0) {
        let CancelOpenOrders = await client.CancelOpenOrders({ symbol: "SOL_USDC" });
        console.log(getNowFormatDate(), "All pending orders canceled");
    }
    let userbalance = await client.Balance();
    let balanceSol = 0;
    if (userbalance.SOL) {
        balanceSol = userbalance.SOL.available
    }
    console.log(getNowFormatDate(), `My Account Infos: ${balanceSol} $SOL | ${userbalance.USDC.available} $USDC`,);
    let { lastPrice } = await client.Ticker({ symbol: "SOL_USDC" });
    console.log(getNowFormatDate(), "Price of sol_usdc:", lastPrice);
    let quantitys = (usdc / lastPrice).toFixed(2).toString();
    console.log(getNowFormatDate(), `Trade ... ${(usdc).toFixed(2).toString()} $USDC to ${quantitys} $SOL`);
    let orderResultBid = await client.ExecuteOrder({
        orderType: "Limit",
        price: (lastPrice + 0.1).toFixed(2).toString(),
        quantity: quantitys,
        side: "Bid",
        symbol: "SOL_USDC"
    })
    buyFlag = false;
    if (orderResultBid?.status == "Filled" && orderResultBid?.side == "Bid") {
        successbuy += 1;
        console.log(getNowFormatDate(), "Bought successfully:", `Order number: ${orderResultBid.id}`);
        console.log(getNowFormatDate(), "Begin wait", `Next order number`);
        totalVolume += usdc;
        await wait(random(5, 10) * 1000);
        console.log(getNowFormatDate(), "End wait", `Next order ...`);
        init(client);
    } else {
        if (orderResultBid?.status == 'Expired') {
            throw new Error("Buy Order Expired");
        } else {
            throw new Error(orderResultBid?.status);
        }
    }
}

(async () => {
    const apisecret = API_SECRET;
    const apikey = API_KEY;
    const client = new backpack_client_1.BackpackClient(apisecret, apikey);
    init(client);
})()
