import { BigNumber } from "ethers/lib/ethers";
import { ethers, upgrades } from "hardhat";
import * as FeePool from  "../deployedAdd.json";

async function getImplementation(proxyAddr: string) {
  const proxyAdmin = await upgrades.admin.getInstance();

  return proxyAdmin.getProxyImplementation(proxyAddr)
}

async function main(){

 const clearinghouse = await ethers.getContractFactory("ClearingHouse");
 const Default_digits = BigNumber.from(10).pow(18);
 const ClearingHouse = await upgrades.deployProxy(clearinghouse, [BigNumber.from(10).mul(Default_digits).div(100),BigNumber.from(625).mul(Default_digits).div(10000),BigNumber.from(125).mul(Default_digits).div(10000),FeePool.InsuranceFundProxy,FeePool.FeePoolProxy], {initializer : "initialize" });
 await ClearingHouse.deployed();

 const impAddr = getImplementation(ClearingHouse.address);

 console.log("Implementation address: ", impAddr);
 console.log("Proxy address: ",ClearingHouse.address);


}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });