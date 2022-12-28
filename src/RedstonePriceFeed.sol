// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.9;

import { PriceAware } from "./PriceAware.sol";
import { BlockContext } from "./utils/BlockContext.sol";
import { IPriceFeed } from "./interface/IPriceFeed.sol";
import { XadeOwnableUpgrade } from "./utils/XadeOwnableUpgrade.sol";

contract RedstonePriceFeed is PriceAware, BlockContext, XadeOwnableUpgrade {
    //address of provider
    address public signer;
    IPriceFeed public PriceFeedL2;

    function initialize() public initializer {
        __Ownable_init();
    }

    function isSignerAuthorized(address _signer) public view virtual override returns (bool) {
        return _signer == signer;
    }

    function updatePrice(bytes32 _priceFeedKey) external {
        uint256 price = getPriceFromMsg(_priceFeedKey);
        PriceFeedL2.setLatestData(_priceFeedKey, price, _blockTimestamp());
    }

    //SETTERS
    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Signer cannot be zero address");
        signer = _signer;
    }

    function setPriceFeedL2(IPriceFeed _priceFeedL2) external onlyOwner {
        require(address(_priceFeedL2) != address(0), "PriceFeedL2 cannot be zero address");
        PriceFeedL2 = _priceFeedL2;
    }
}
