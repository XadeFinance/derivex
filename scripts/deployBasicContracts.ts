import { ethers, upgrades } from "hardhat";

async function getImplementation(proxyAddr: string) {
  const proxyAdmin = await upgrades.admin.getInstance();

  return proxyAdmin.getProxyImplementation(proxyAddr)
}

async function main(){

 const chainlinkL1 = await ethers.getContractFactory("ChainlinkL1");
 const ChainlinkL1 = await upgrades.deployProxy(chainlinkL1, ["0x6eA65716AD03884D84A908A9c13149eCADB03059"], {initializer : "initialize" });
 await ChainlinkL1.deployed();

 const impAddr = await getImplementation(ChainlinkL1.address);
 console.log("Implementation address", impAddr);
 console.log("Proxy address", ChainlinkL1.address);


}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
