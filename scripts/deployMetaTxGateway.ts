import { ethers, upgrades } from "hardhat";
//import * as FeePool from  "../deployedAdd.json";

async function getImplementation(proxyAddr: string) {
  const proxyAdmin = await upgrades.admin.getInstance();

  return proxyAdmin.getProxyImplementation(proxyAddr)
}

async function main(){

 const metatx = await ethers.getContractFactory("MetaTxGateway");
 const MetaTx = await upgrades.deployProxy(metatx, ["test","1",80001], {initializer : "initialize" });
 await MetaTx.deployed();

 const impAddr = await getImplementation(MetaTx.address);

 console.log("Implementation address: ", impAddr);
 console.log("Proxy address: ",MetaTx.address);


}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });