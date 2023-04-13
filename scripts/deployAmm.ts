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

 const weiPrice = ethers.utils.parseEther(price.toString());
 const baseAssetReserve = BigNumber.from(500).mul(Default_digits);
 const quoteAssetReserve = baseAssetReserve.mul(weiPrice).div(Default_digits);
 const tradeLimitRatio = BigNumber.from(90).mul(Default_digits).div(100);
 const fundingPeriod = BigNumber.from(1800); //30 minutes
 const fluctuationLimitRatio = BigNumber.from(12).mul(Default_digits).div(1000);// 1.2%
 const priceFeedKey = ethers.utils.formatBytes32String("BTC");
 const priceFeed = "0x6eA65716AD03884D84A908A9c13149eCADB03059";
 const quoteAsset = "0xA3C957f5119eF3304c69dBB61d878798B3F239D9";
 const tollRatio = BigNumber.from(27).mul(Default_digits).div(10000); //0.27%
 const spreadRatio = BigNumber.from(3).mul(Default_digits).div(10000) //0.03%


 console.log("Price of BTC/USD", price);
//  console.log("Price of ETH/USD", ETHprice);
  const Amm = await upgrades.deployProxy(amm,  [quoteAssetReserve, baseAssetReserve, tradeLimitRatio, fundingPeriod, priceFeed, priceFeedKey, quoteAsset, fluctuationLimitRatio, tollRatio, spreadRatio], {initializer : "initialize" });
  await Amm.deployed();

  const impAddr = await getImplementation(Amm.address);

  console.log("Implementation address: ", impAddr);
  console.log("Proxy address: ",Amm.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});