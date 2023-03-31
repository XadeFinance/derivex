import { BigNumber } from "ethers/lib/ethers";
import { ethers, upgrades } from "hardhat";
import * as deployedAdd from  "../deployedAdd.json";
import getPrice from "../price";
import getPriceETH from "../priceFeedETH";

async function getImplementation(proxyAddr: string) {
  const proxyAdmin = await upgrades.admin.getInstance();

  return proxyAdmin.getProxyImplementation(proxyAddr)
}

async function main(){

 const amm = await ethers.getContractFactory("Amm");
 const Default_digits = BigNumber.from(10).pow(18);
 
 const BTCPrice = await getPrice();
 const big =  BigNumber.from(BTCPrice);
 let price =  big.toNumber();

 const ETHPrice = await getPriceETH();
 const ETHbig =  BigNumber.from(ETHPrice);
 const ETHprice =  ETHbig.toNumber();


 const baseAsset = BigNumber.from(500).mul(Default_digits);


//  console.log(price);
//  console.log(ETHprice);
 price=price/ETHprice;
//  console.log(price);
//  price=price/100000000;
//  console.log(price);
 const weiPrice = ethers.utils.parseEther(price.toString());

//  console.log("Price of BTC/USD", price);
//  console.log("Price of ETH/USD", ETHprice);
  const Amm = await upgrades.deployProxy(amm, [baseAsset,baseAsset.mul(weiPrice).div(Default_digits),BigNumber.from(90).mul(Default_digits).div(100), BigNumber.from(3600), deployedAdd.PriceFeedL2Imp, ethers.utils.formatBytes32String("BTC"), "0xA3C957f5119eF3304c69dBB61d878798B3F239D9", BigNumber.from(12).mul(Default_digits).div(10000), BigNumber.from(27).mul(Default_digits).div(100000), BigNumber.from(3).mul(Default_digits).div(1000000)], {initializer : "initialize" });
 await Amm.deployed();

 const impAddr = await getImplementation(Amm.address);

 console.log("Implementation address: ", impAddr);
  console.log("Proxy address: ",Amm.address);


}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });