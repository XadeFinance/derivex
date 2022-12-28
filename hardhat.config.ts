import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-truffle5"
import "@nomiclabs/hardhat-waffle"
import "@openzeppelin/hardhat-upgrades"
import "@typechain/hardhat"
import "@typechain/ethers-v5"
import "ethers"
// need to write a open zeppelin's proxyResolver if using any deployProxy in test case
// https://github.com/cgewecke/eth-gas-reporter/blob/master/docs/advanced.md
import "hardhat-gas-reporter"
import { HardhatUserConfig, task } from "hardhat/config"
import "solidity-coverage"
import {
    ARTIFACTS_DIR,
    COVERAGE_URL,
    ETHERSCAN_API_KEY,
    GAS_PRICE,
    RINKEBY_MNEMONIC,
    RINKEBY_URL,
    ROOT_DIR,
    SRC_DIR,
} from "./constants"

const config: HardhatUserConfig = {
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
        },
        coverage: {
            url: COVERAGE_URL,
        },
        rinkeby: {
            url: RINKEBY_URL,
            gasPrice: GAS_PRICE,
            accounts: {
                mnemonic: RINKEBY_MNEMONIC,
            },
        },
    },
    solidity: {
        //version: "0.6.9",
        compilers: [
            {
              version: "0.6.9"
            },
          ],
        settings: {
            optimizer: { enabled: true, runs: 200 },
            evmVersion: "istanbul",
        },
    },
    paths: {
        root: ROOT_DIR,
        // source & artifacts does not work since we use openzeppelin-sdk for upgradable contract
        sources: SRC_DIR,
        artifacts: ARTIFACTS_DIR,
        tests: "./tests",
        cache: "./cache",
    },
    mocha: {
        timeout: 60000,
    },
    gasReporter: {
        src: "src", // Folder in root directory to begin search for .sol file
        currency: "USD", // gasPrice based on current ethGasStation API
        coinmarketcap: process.env.CMC_API_KEY, // optional
    },
    etherscan: {
        // Your API key for Etherscan
        // Obtain one at https://etherscan.io/
        apiKey: ETHERSCAN_API_KEY,
    },
    
}

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();
  
    for (const account of accounts) {
      console.log(account.address);
    }
  });

export default config
