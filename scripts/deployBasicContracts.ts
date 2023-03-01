import { ethers, upgrades } from "hardhat";

async function getImplementation(proxyAddr: string) {
  const proxyAdmin = await upgrades.admin.getInstance();

  return proxyAdmin.getProxyImplementation(proxyAddr)
}

async function main(){

 const feePool = await ethers.getContractFactory("PriceFeedL2");
 const FeePool = await upgrades.deployProxy(feePool, {initializer : "initialize" });
 await FeePool.deployed();

 console.log(FeePool.address);


}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });