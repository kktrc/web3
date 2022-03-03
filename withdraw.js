const Web3 = require('web3')
const moment = require('moment')

const rpcURL = 'https://polygon-rpc.com/' //链的地址
const web3 = new Web3(rpcURL)

const config = require('./config.json');

const contractABI = require('./abi.json') //合约abi
const contractAddress = '0xda3f4d9509c1881f0661bc943db23024b7de2f82' //合约地址
const contract = new web3.eth.Contract(contractABI, contractAddress)

const contractMaticFemoABI = require('./maticfemo_abi.json');
const contractMaticFemoAddress = '0x6AEdB4f17Ddd4d405bABec26b4de31a06E098696';
const contractMaticFemo = new web3.eth.Contract(contractMaticFemoABI, contractMaticFemoAddress);

async function invest(account, privateKey, amount) {
    printLog('invest: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

    const privateKeyAccount = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(privateKeyAccount);
    web3.eth.defaultAccount = privateKeyAccount.address;

    await contract.methods.invest(account, 2).send({
        from: web3.eth.defaultAccount,
        value: web3.utils.toWei(amount, 'ether'),
        gas: 530000,
        gasPrice: web3.utils.toWei('60', 'gwei')
    });
}

function printLog(msg) {
    console.log('time: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss') + ' msg: ' + msg);
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function waitTransaction(txHash) {
    let tx = null;
    while (tx == null) {
        tx = await web3.eth.getTransactionReceipt(txHash);
        printLog('sleep for waitTransaction');
        await sleep(2000);
    }
    printLog("Transaction " + txHash + " was mined.");
    return (tx.status);
}

async function getBalance(account) {
    var balance = await web3.eth.getBalance(account);
    var balance1 = web3.utils.fromWei(balance, 'ether');
    printLog('getBalance wallet: ' + account + ' balance: ' + balance1);
    return parseFloat(balance1).toFixed(4);
}

async function withdraw(address, privateKey) {
    printLog('withdraw: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

    const accountNonce = await web3.eth.getTransactionCount(address);
    var sign = await web3.eth.accounts.signTransaction({
        nonce: web3.utils.toHex(accountNonce),
        from: address,
        gas: 530000,
        gasPrice: web3.utils.toWei('50', 'gwei'),
        to: contractAddress,
        data: contract.methods.withdraw().encodeABI()
    }, privateKey);
    var result = await web3.eth.sendSignedTransaction(sign.rawTransaction);

    await waitTransaction(result.transactionHash);

    printLog('wallet: ' + address + ' withdraw success!');

    var balance = await getBalance(address);
    printLog('wallet: ' + address + ' withdraw balance: ' + balance);
    return balance;
}

async function withdrawMaticFemo(address, privateKey) {
    printLog('withdrawMaticFemo: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

    var sign = await web3.eth.accounts.signTransaction({
        from: address,
        gas: 530000,
        gasPrice: web3.utils.toWei('70', 'gwei'),
        to: contractMaticFemoAddress,
        data: contractMaticFemo.methods.withdraw().encodeABI()
    }, privateKey);
    var result = await web3.eth.sendSignedTransaction(sign.rawTransaction);

    await waitTransaction(result.transactionHash);

    printLog('wallet: ' + address + ' withdraw success!');

    var balance = await getBalance(address);
    printLog('wallet: ' + address + ' withdraw balance: ' + balance);
    return balance;
}

async function transfer(fromAccount, privateKey, toAccount, amount) {
    printLog('transfer: from wallet: ' + fromAccount + ' to wallet: ' + toAccount + ' amount: ' + amount);
    if (amount <= 0) {
        throw 'amount is zero';
    }
    const accountNonce = await web3.eth.getTransactionCount(fromAccount);
    var sign = await web3.eth.accounts.signTransaction({
        nonce: web3.utils.toHex(accountNonce),
        from: fromAccount,
        gas: 21000,
        value: web3.utils.toWei(amount, 'ether'),
        gasPrice: web3.utils.toWei('50', 'gwei'),
        to: toAccount
    }, privateKey);
    var result = await web3.eth.sendSignedTransaction(sign.rawTransaction);

    await waitTransaction(result.transactionHash); // 等待交易完成
    printLog('wallet1: ' + fromAccount + ' transfer to wallet2: ' + toAccount + ' success, transfer value is ' + amount);
}

async function transferAll(balance, fromAccount, privateKey, toAccount) {
    var amount = (balance - 0.05).toFixed(4);
    await transfer(fromAccount, privateKey, toAccount, amount)
    return amount;
}

async function transferTOAccount1() {
    var account = config.user3.wallet;
    var privateKey = config.user3.privateKey;

    // 转0.1到账户1
    await transfer(account, privateKey, config.user1.wallet, '0.05');
}

async function safeTransferAll(balance, fromAccount, privateKey, toAccount) {
    var flag = false;
    var count = 0;
    do {
        try {
            await transferAll(balance, fromAccount, privateKey, toAccount);
            flag = true;
        } catch (err) {
            printLog('safeTransferAll error: ' + err.message);
            flag = false;
            await sleep(1000); //睡眠3秒
            balance = await getBalance(fromAccount); // 更新一下余额
        }
        count++;
        printLog("transfer count: " + count);
    } while (!flag && count <= 20);
}

async function safeWithdraw(fromAccount, privateKey) {
    var flag = false;
    var count = 0;
    var balance = null;
    do {
        try {
            balance = await withdraw(fromAccount, privateKey);
            flag = true;
        } catch (err) {
            printLog('safeWithdraw error: ' + err.message);
            flag = false;
            await sleep(3000); //睡眠2秒
        }
        count++;
        printLog("withdraw count: " + count);
    } while (!flag && count <= 10);
    return balance;
}

async function withdrawMaticFemoAndTransfer() {
    var fromAccount = config.user1.wallet;
    var privateKey = config.user1.privateKey;
    var toAccount = config.user3.wallet;

    // 查询余额
    var balance = await getBalance(fromAccount);
    printLog(balance);
    if (parseFloat(balance) <= 0.04) {
        printLog('balance is low, transferTOAccount1');
        await transferTOAccount1();
        await sleep(4000); // 等待4秒
    }
    // 提款
    balance = await withdrawMaticFemo(fromAccount, privateKey);
    await sleep(3000); // 等待3秒
    printLog('start transferAll');

    // 转账
    await safeTransferAll(balance, fromAccount, privateKey, toAccount);
}

async function withdrawAndTransfer1() {
    var fromAccount = config.user1.wallet;
    var privateKey = config.user1.privateKey;
    var toAccount = config.user3.wallet;

    // 查询余额
    var balance = await getBalance(fromAccount);
    printLog(balance);
    if (parseFloat(balance) <= 0.04) {
        printLog('balance is low, transferTOAccount1');
        await transferTOAccount1();
        await sleep(4000); // 等待4秒
    }

    // 提款
    balance = await safeWithdraw(fromAccount, privateKey);
    await sleep(3000); // 等待3秒
    printLog('start transferAll');

    // 转账
    await safeTransferAll(balance, fromAccount, privateKey, toAccount);
}

async function withdrawAndTransfer2() {
    var fromAccount = config.user2.wallet;
    var privateKey = config.user2.privateKey;
    var toAccount = config.user3.wallet;

    var balance = await safeWithdraw(fromAccount, privateKey);
    printLog('start transferAll')

    // 转账
    await safeTransferAll(balance, fromAccount, privateKey, toAccount);
}

async function withdrawAndTransfer3() {
    var account = config.user3.wallet;
    var privateKey = config.user3.privateKey;

    await safeWithdraw(account, privateKey);

    const balance = await getBalance(account);
    if (balance > 100) {
        await invest(account, privateKey, '10');
    }
}

async function goRun() {
    //await withdrawMaticFemoAndTransfer();
    await withdrawAndTransfer1();
    await withdrawAndTransfer2();
    await withdrawAndTransfer3();
}

printLog('goRun: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));
//goRun();
setInterval(goRun, 60 * 60 * 1000);
