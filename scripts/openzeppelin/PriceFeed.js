const { ethers } = require("ethers");
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');

const chainlinkAbi = PRICEFEED_ABI;
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
