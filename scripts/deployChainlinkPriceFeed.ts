import { ethers, upgrades } from "hardhat";
import * as FeePool from  "../deployedAdd.json";

async function getImplementation(proxyAddr: string) {
  const proxyAdmin = await upgrades.admin.getInstance();

  return proxyAdmin.getProxyImplementation(proxyAddr)
}

async function main(){

 const chainlink = await ethers.getContractFactory("ChainlinkL1");
 const ChainLink = await upgrades.deployProxy(chainlink, [FeePool.PriceFeedL2Imp], {initializer : "initialize" });
 await ChainLink.deployed();

 const impAddr = getImplementation(ChainLink.address);

 console.log("Implementation address: ", impAddr);
 console.log("Proxy address: ",ChainLink.address);


}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });