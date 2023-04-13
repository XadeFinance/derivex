import { ethers, upgrades } from "hardhat";

async function getImplementation(proxyAddr: string) {
    const proxyAdmin = await upgrades.admin.getInstance();
    return proxyAdmin.getProxyImplementation(proxyAddr)
}

const balancerPool = "0x06Df3b2bbB68adc8B0e302443692037ED9f91b42";
const compCUSDT = "0x914eEA7c8e362f0D593F279209a56C28A375deBA";
const USDC = "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747";

async function main(){
    const exchangeWrapper = await ethers.getContractFactory("ExchangeWrapper");
    const ExchangeWrapper = await upgrades.deployProxy(exchangeWrapper, [balancerPool, compCUSDT, USDC], {initializer : "initialize" });
    await ExchangeWrapper.deployed();

    const impAddr = await getImplementation(ExchangeWrapper.address);
    console.log("Implementation address", impAddr);
    console.log("Proxy address", ExchangeWrapper.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
