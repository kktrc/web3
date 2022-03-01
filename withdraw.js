const Web3 = require('web3')
const moment = require('moment')

const rpcURL = 'https://rpc-mainnet.maticvigil.com/' //链的地址
const web3 = new Web3(rpcURL)

const config = require('./config.json');
console.log(config);

const contractABI = require('./abi.json') //合约abi
const contractAddress = '0xda3f4d9509c1881f0661bc943db23024b7de2f82' //合约地址
const contract = new web3.eth.Contract(contractABI, contractAddress)

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function getBalance(account) {
    var balance = await web3.eth.getBalance(account);
    var balance1 = web3.utils.fromWei(balance, 'ether');
    console.log('getBalance wallet: ' + account + ' balance: ' + balance1);
    return parseFloat(balance1).toFixed(4);
}

async function withdraw(address, privateKey) {
    console.log('withdraw: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

    var sign = await web3.eth.accounts.signTransaction({
        // nonce: nonce,
        from: address,
        gas: 530000,
        gasPrice: web3.utils.toWei('40', 'gwei'),
        to: contractAddress,
        data: contract.methods.withdraw().encodeABI()
    }, privateKey);
    var result = await web3.eth.sendSignedTransaction(sign.rawTransaction);
    console.log(result.blockHash);
    console.log('wallet: ' + address + ' withdraw success!');

    var balance = await getBalance(address);
    console.log('wallet: ' + address + ' withdraw balance: ' + balance);
    return balance;
}

async function transfer(fromAccount, privateKey, toAccount, amount) {
    console.log('transfer: from wallet: ' + fromAccount + ' to wallet: ' + toAccount + ' amount: ' + amount);

    var sign = await web3.eth.accounts.signTransaction({
        // nonce: nonce,
        from: fromAccount,
        gas: 21000,
        value: web3.utils.toWei(amount, 'ether'),
        gasPrice: web3.utils.toWei('40', 'gwei'),
        to: toAccount
    }, privateKey);
    var result = await web3.eth.sendSignedTransaction(sign.rawTransaction);

    console.log(result.blockHash);
    console.log('wallet1: ' + fromAccount + ' transfer to wallet2: ' + toAccount + ' success, transfer value is ' + amount);
}

async function transferAll(balance, fromAccount, privateKey, toAccount) {
    var amount = (balance - 0.05).toFixed(4);
    await transfer(fromAccount, privateKey, toAccount, amount)
}

async function transferTOAccount1() {
    var account = config.user3.wallet;
    var privateKey = config.user3.privateKey;

    // 转0.1到账户1
    await transfer(account, privateKey, config.user1.wallet, '0.05');
}

async function safeTransferAll(balance, fromAccount, privateKey, toAccount) {
    var transferFlag = false;
    var transferCount = 0;
    do {
        try {
            await transferAll(balance, fromAccount, privateKey, toAccount);
        } catch (err) {
            console.log(err);
            transferFlag = true;
        }
        transferCount++;
        await sleep(2000); //睡眠2秒
        balance = await getBalance(fromAccount); // 更新一下余额
    } while (transferFlag && transferCount <= 3);
}

async function withdrawAndTransfer1() {
    var fromAccount = config.user1.wallet;
    var privateKey = config.user1.privateKey;
    var toAccount = config.user3.wallet;

    // 查询余额
    var balance = await getBalance(fromAccount);
    console.log(balance);
    if (parseFloat(balance) <= 0.05) {
        console.log('balance is low, transferTOAccount1');
        await transferTOAccount1();
        await sleep(4000); // 等待4秒
    }

    // 提款
    balance = await withdraw(fromAccount, privateKey);
    await sleep(3000); // 等待3秒
    console.log('start transferAll');

    // 转账
    safeTransferAll(balance, fromAccount, privateKey, toAccount);
}

async function withdrawAndTransfer2() {
    var fromAccount = config.user2.wallet;
    var privateKey = config.user2.privateKey;
    var toAccount = config.user3.wallet;

    var balance = await withdraw(fromAccount, privateKey);
    console.log('start transferAll')

    // 转账
    safeTransferAll(balance, fromAccount, privateKey, toAccount);
}

async function withdrawAndTransfer3() {
    var account = config.user3.wallet;
    var privateKey = config.user3.privateKey;

    await withdraw(account, privateKey);
}

async function goRun() {
    await withdrawAndTransfer1();
    await withdrawAndTransfer2();
    await withdrawAndTransfer3();
}

//goRun();
console.log('goRun: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));
setInterval(goRun, 60 * 60 * 1000);
