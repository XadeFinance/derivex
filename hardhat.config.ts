import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-truffle5"
import "@nomiclabs/hardhat-waffle"
import "@openzeppelin/hardhat-upgrades"
import "@typechain/hardhat"
import "@typechain/ethers-v5"
import "ethers"
import "dotenv/config"
import "hardhat-contract-sizer"
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
    MUMBAI_MNEMONIC,
    MUMBAI_URL,
    POLYGONPoS_MNEMONIC,
    POLYGONPoS_URL,
    ALFAJORES_MNEMONIC,
    ALFAJORES_URL,
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
        PolygonPoS: {
            url: POLYGONPoS_URL,
            gasPrice: GAS_PRICE,
            accounts : [POLYGONPoS_MNEMONIC ],
        },
        Mumbai: {
            url: MUMBAI_URL,
            gasPrice: GAS_PRICE,
            accounts: [ MUMBAI_MNEMONIC ],
        },
        alfajores: {
            url: ALFAJORES_URL,
            gasPrice : GAS_PRICE,
            accounts : [ ALFAJORES_MNEMONIC ]
        },
    },
    solidity: {
        //version: "0.6.9",
        compilers: [
            {
              version: "0.6.9",
              settings: {
                optimizer: { enabled: true, runs: 200 },
                evmVersion: "istanbul",
            },
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

    // contractSizer: {
    //     alphaSort: true,
    //     disambiguatePaths: false,
    //     runOnCompile: true,
    //     strict: true,
    //     only: [':ClearingHouse$', ':Amm$'],
    //   }
    
}

task("accounts", "Prints the list of accounts", async (taskArgs: any, hre: any) => {
    const accounts = await hre.ethers.getSigners();
  
    for (const account of accounts) {
      console.log(account.address);
    }
  });

export default config
