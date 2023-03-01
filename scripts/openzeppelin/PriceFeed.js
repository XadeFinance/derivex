const { ethers } = require("ethers");
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');

const chainlinkAbi = { "_format": "hh-sol-artifact-1", "contractName": "ChainlinkL1", "sourceName": "src/ChainlinkPriceFeed.sol", "abi": [ { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" } ], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "internalType": "address", "name": "priceFeedL2", "type": "address" } ], "name": "PriceFeedL2Changed", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "internalType": "bytes32", "name": "messageId", "type": "bytes32" } ], "name": "PriceUpdateMessageIdSent", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "internalType": "bytes32", "name": "priceFeedKey", "type": "bytes32" }, { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" } ], "name": "PriceUpdated", "type": "event" }, { "inputs": [ { "internalType": "bytes32", "name": "_priceFeedKey", "type": "bytes32" }, { "internalType": "address", "name": "_aggregator", "type": "address" } ], "name": "addAggregator", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "candidate", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes32", "name": "_priceFeedKey", "type": "bytes32" } ], "name": "getAggregator", "outputs": [ { "internalType": "contract AggregatorV3Interface", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "_priceFeedL2", "type": "address" } ], "name": "initialize", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes32", "name": "", "type": "bytes32" } ], "name": "prevTimestampMap", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "priceFeedKeys", "outputs": [ { "internalType": "bytes32", "name": "", "type": "bytes32" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "priceFeedL2", "outputs": [ { "internalType": "contract IPriceFeed", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes32", "name": "", "type": "bytes32" } ], "name": "priceFeedMap", "outputs": [ { "internalType": "contract AggregatorV3Interface", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes32", "name": "_priceFeedKey", "type": "bytes32" } ], "name": "removeAggregator", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "newOwner", "type": "address" } ], "name": "setOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "_priceFeedL2", "type": "address" } ], "name": "setPriceFeedL2", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "bytes32", "name": "_priceFeedKey", "type": "bytes32" } ], "name": "updateLatestRoundData", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "updateOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" } ], }

// TO-DO: Add PriceFeed contract address
const contractAddress = CHAINLINK_PRICE_FEED_ADDRESS;

exports.main = async function(signer) {
    const PriceFeed = new ethers.Contract(contractAddress, chainlinkAbi, signer);
    
    await PriceFeed.updateLatestRoundData("BTC");
}

// Entry point for Autotask
exports.handler = async function(credentials) {
    const provider = new DefenderRelayProvider(credentials);
    const signer = new DefenderRelaySigner(credentials, provider, {speed: 'fast'})
    return exports.main(signer)
}

// To run script locally
if (require.main === module) {
    require('dotenv').config();
    const { API_KEY: apiKey, API_SECRET: apiSecret } = process.env;
    exports.handler({ apiKey, apiSecret })
      .then(() => process.exit(0))
      .catch(error => { console.error(error); process.exit(1); });
}
