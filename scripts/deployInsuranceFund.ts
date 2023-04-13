import { ethers, upgrades } from "hardhat";

async function getImplementation(proxyAddr: string) {
  const proxyAdmin = await upgrades.admin.getInstance();

  return proxyAdmin.getProxyImplementation(proxyAddr)
}

async function main(){

 const insurancefund = await ethers.getContractFactory("InsuranceFund");
 const InsuranceFund = await upgrades.deployProxy(insurancefund, {initializer : "initialize" });
 await InsuranceFund.deployed();

 const impAddr = await getImplementation(InsuranceFund.address);
 console.log("Implementation address", impAddr);
 console.log("Proxy address", InsuranceFund.address);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });