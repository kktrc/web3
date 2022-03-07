const Web3 = require('web3')
const moment = require('moment')

const rpcURL = 'https://polygon-rpc.com/' //链的地址
const web3 = new Web3(rpcURL)

const config = require('./config.json');

const contractABI = require('./abi.json') //合约abi
const contractAddress = '0xda3f4d9509c1881f0661bc943db23024b7de2f82' //合约地址
const contract = new web3.eth.Contract(contractABI, contractAddress);

function printLog(msg) {
    console.log('time: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss') + ' msg: ' + msg);
}

async function invest(account, privateKey, amount) {
    printLog('invest: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

    const privateKeyAccount = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(privateKeyAccount);
    web3.eth.defaultAccount = privateKeyAccount.address;

    await contract.methods.invest(account, 0).send({
        from: web3.eth.defaultAccount,
        value: web3.utils.toWei(amount, 'ether'),
        gas: 530000,
        gasPrice: web3.utils.toWei('60', 'gwei')
    });
}

async function getBalance(account) {
    var balance = await web3.eth.getBalance(account);
    var balance1 = web3.utils.fromWei(balance, 'ether');
    printLog('getBalance wallet: ' + account + ' balance: ' + balance1);
    return parseFloat(balance1).toFixed(4);
}

async function goRun() {
    var account = config.user3.wallet;
    var privateKey = config.user3.privateKey;

    var balance = await getBalance(account);
    if (balance > 20.0) {
        await invest(account, privateKey, '20');
    }
}

printLog('goRun: ' + moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));
goRun();
setInterval(goRun, 10 * 60 * 1000);