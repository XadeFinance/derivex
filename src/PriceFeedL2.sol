// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.9;

import "./utils/XadeOwnableUpgrade.sol";
import { SafeMath } from "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import { BlockContext } from "./utils/BlockContext.sol";
import { IPriceFeed } from "./interface/IPriceFeed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

contract PriceFeedL2 is IPriceFeed, BlockContext, XadeOwnableUpgrade {
    using SafeMath for uint256;

    
    modifier onlyOracle() {
        require(_msgSender() == oracle);
        _;
    }

    event PriceFeedDataSet(bytes32 key, uint256 price, uint256 timestamp);

    struct PriceData {
        uint256 price;
        uint256 timestamp;
    }

    struct PriceFeed {
        bool registered;
        PriceData[] priceData;
    }

    //**********************************************************//
    //    The below state variables can not change the order    //
    //**********************************************************//

    // key by currency symbol, eg ETH
    mapping(bytes32 => PriceFeed) public priceFeedMap;
    bytes32[] public priceFeedKeys;
    // assress for oracle contract
    address public oracle;

    //**********************************************************//
    //    The above state variables can not change the order    //
    //**********************************************************//

    //◥◤◥◤◥◤◥◤◥◤◥◤◥◤◥◤ add state variables below ◥◤◥◤◥◤◥◤◥◤◥◤◥◤◥◤//

    //◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣ add state variables above ◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣//
    uint256[50] private __gap;

    //
    // FUNCTIONS
    //
    function initialize() public initializer {
        __Ownable_init();
    }

    function addAggregator(bytes32 _priceFeedKey) external onlyOwner {
        requireKeyExisted(_priceFeedKey, false);
        priceFeedMap[_priceFeedKey].registered = true;
        priceFeedKeys.push(_priceFeedKey);
    }

    function removeAggregator(bytes32 _priceFeedKey) external onlyOwner {
        requireKeyExisted(_priceFeedKey, true);
        delete priceFeedMap[_priceFeedKey];

        uint256 length = priceFeedKeys.length;
        for (uint256 i; i < length; i++) {
            if (priceFeedKeys[i] == _priceFeedKey) {
                priceFeedKeys[i] = priceFeedKeys[length - 1];
                priceFeedKeys.pop();
                break;
            }
        }
    }

    //
    // INTERFACE IMPLEMENTATION
    //

    function setLatestData(
        bytes32 _priceFeedKey,
        uint256 _price,
        uint256 _timestamp
    ) external override onlyOracle {
        require(isExistedKey(_priceFeedKey), "key not existed");
        PriceData memory data = PriceData({ price: _price, timestamp: _timestamp });
        priceFeedMap[_priceFeedKey].priceData.push(data);

        emit PriceFeedDataSet(_priceFeedKey, _price, _timestamp);
    }

    function getPrice(bytes32 _priceFeedKey) external view override returns (uint256) {
        require(isExistedKey(_priceFeedKey), "key not existed");
        uint256 len = getPriceFeedLength(_priceFeedKey);
        require(len > 0, "no price data");
        return priceFeedMap[_priceFeedKey].priceData[len - 1].price;
    }

    function getLatestTimestamp(bytes32 _priceFeedKey) public view override returns (uint256) {
        require(isExistedKey(_priceFeedKey), "key not existed");
        uint256 len = getPriceFeedLength(_priceFeedKey);
        if (len == 0) {
            return 0;
        }
        return priceFeedMap[_priceFeedKey].priceData[len - 1].timestamp;
    }

    function getTwapPrice(bytes32 _priceFeedKey, uint256 _interval) external view override returns (uint256) {
        require(isExistedKey(_priceFeedKey), "key not existed");
        require(_interval != 0, "interval can't be 0");

        // ** We assume L1 and L2 timestamp will be very similar here **
        // 3 different timestamps, `previous`, `current`, `target`
        // `base` = now - _interval
        // `current` = current round timestamp from aggregator
        // `previous` = previous round timestamp form aggregator
        // now >= previous > current > = < base
        //
        //  while loop i = 0
        //  --+------+-----+-----+-----+-----+-----+
        //         base                 current  now(previous)
        //
        //  while loop i = 1
        //  --+------+-----+-----+-----+-----+-----+
        //         base           current previous now

        uint256 len = getPriceFeedLength(_priceFeedKey);
        require(len > 0, "Not enough history");
        uint256 round = len - 1;
        PriceData memory priceRecord = priceFeedMap[_priceFeedKey].priceData[round];
        uint256 latestTimestamp = priceRecord.timestamp;
        uint256 baseTimestamp = _blockTimestamp().sub(_interval);
        // if latest updated timestamp is earlier than target timestamp, return the latest price.
        if (latestTimestamp < baseTimestamp || round == 0) {
            return priceRecord.price;
        }

        // rounds are like snapshots, latestRound means the latest price snapshot. follow chainlink naming
        uint256 cumulativeTime = _blockTimestamp().sub(latestTimestamp);
        uint256 previousTimestamp = latestTimestamp;
        uint256 weightedPrice = priceRecord.price.mul(cumulativeTime);
        while (true) {
            if (round == 0) {
                // if cumulative time is less than requested interval, return current twap price
                return (weightedPrice.div(cumulativeTime));
            }

            round = round.sub(1);
            // get current round timestamp and price
            priceRecord = priceFeedMap[_priceFeedKey].priceData[round];
            uint256 currentTimestamp = priceRecord.timestamp;
            uint256 price = priceRecord.price;

            // check if current round timestamp is earlier than target timestamp
            if (currentTimestamp <= baseTimestamp) {
                // weighted time period will be (target timestamp - previous timestamp). For example,
                // now is 1000, _interval is 100, then target timestamp is 900. If timestamp of current round is 970,
                // and timestamp of NEXT round is 880, then the weighted time period will be (970 - 900) = 70,
                // instead of (970 - 880)
                weightedPrice = weightedPrice.add(price.mul(previousTimestamp.sub(baseTimestamp)));
                break;
            }

            uint256 timeFraction = previousTimestamp.sub(currentTimestamp);
            weightedPrice = weightedPrice.add(price.mul(timeFraction));
            cumulativeTime = cumulativeTime.add(timeFraction);
            previousTimestamp = currentTimestamp;
        }
        return weightedPrice.div(_interval);
    }

    function getPreviousPrice(bytes32 _priceFeedKey, uint256 _numOfRoundBack) public view override returns (uint256) {
        require(isExistedKey(_priceFeedKey), "key not existed");

        uint256 len = getPriceFeedLength(_priceFeedKey);
        require(len > 0 && _numOfRoundBack < len, "Not enough history");
        return priceFeedMap[_priceFeedKey].priceData[len - _numOfRoundBack - 1].price;
    }

    function getPreviousTimestamp(bytes32 _priceFeedKey, uint256 _numOfRoundBack)
        public
        view
        override
        returns (uint256)
    {
        require(isExistedKey(_priceFeedKey), "key not existed");

        uint256 len = getPriceFeedLength(_priceFeedKey);
        require(len > 0 && _numOfRoundBack < len, "Not enough history");
        return priceFeedMap[_priceFeedKey].priceData[len - _numOfRoundBack - 1].timestamp;
    }

    //
    // END OF INTERFACE IMPLEMENTATION
    //

    function getPriceFeedLength(bytes32 _priceFeedKey) public view returns (uint256 length) {
        return priceFeedMap[_priceFeedKey].priceData.length;
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "oracle can't be zero address");
        require(_oracle != oracle, "Same as current one");
        oracle = _oracle;
    }

    // INTERNAL

    function isExistedKey(bytes32 _priceFeedKey) private view returns (bool) {
        return priceFeedMap[_priceFeedKey].registered;
    }

    function requireKeyExisted(bytes32 _key, bool _existed) internal view {
        if (_existed) {
            require(isExistedKey(_key), "key not existed");
        } else {
            require(!isExistedKey(_key), "key existed");
        }
    }
}
