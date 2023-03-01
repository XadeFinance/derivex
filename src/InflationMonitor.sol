// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import { XadeOwnableUpgrade } from "./utils/XadeOwnableUpgrade.sol";
import { Decimal, SafeMath } from "./utils/Decimal.sol";
import { DecimalERC20 } from "./utils/DecimalERC20.sol";
import { IMultiTokenRewardRecipient } from "./interface/IMultiTokenRewardRecipient.sol";
import { BlockContext } from "./utils/BlockContext.sol";
import { IInflationMonitor } from "./interface/IInflationMonitor.sol";

// record the extra inflation due to the unexpected loss
contract InflationMonitor is IInflationMonitor, XadeOwnableUpgrade, BlockContext, DecimalERC20 {
    using Decimal for Decimal.decimal;
    using SafeMath for uint256;

    /**
     * @notice Stores timestamp and cumulative amount of token withdrawn by InsuranceFund
     */
    struct WithdrawalEntry {
        uint256 timestamp;
        Decimal.decimal cumulativeAmount;
    }

    //**********************************************************//
    //    Can not change the order of below state variables     //
    //**********************************************************//

    uint256 public constant THRESHOLD_PERIOD = 2 weeks;

    // An array of withdrawal timestamps and cumulative amount
    WithdrawalEntry[] private withdrawalHistory;

    /**
     * @notice in percentage, if (funds withdrawn in a week) / (total balance of pool at start of week) is less than `shutdownThreshold`,
     * it's ready to shutdown
     */
    Decimal.decimal public shutdownThreshold;

    IMultiTokenRewardRecipient private tollPool;

    uint256[50] private __gap;

    //**********************************************************//
    //    Can not change the order of above state variables     //
    //**********************************************************//

    //◥◤◥◤◥◤◥◤◥◤◥◤◥◤◥◤ add state variables below ◥◤◥◤◥◤◥◤◥◤◥◤◥◤◥◤//

    //◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣ add state variables above ◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣//

    function initialize(IMultiTokenRewardRecipient _tollPool) public initializer {
        __Ownable_init();

        tollPool = _tollPool;
        shutdownThreshold = Decimal.one().divScalar(10);
    }

    function setShutdownThreshold(Decimal.decimal memory _shutdownThreshold) public onlyOwner {
        shutdownThreshold = _shutdownThreshold;
    }

    function appendToWithdrawalHistory(Decimal.decimal calldata _amount) external override {
        require(_msgSender() == address(tollPool), "!tollPool");
        Decimal.decimal memory cumulativeAmount;
        uint256 len = withdrawalHistory.length;
        if (len == 0) {
            cumulativeAmount = _amount;
        } else {
            cumulativeAmount = withdrawalHistory[len - 1].cumulativeAmount.addD(_amount);
        }
        withdrawalHistory.push(WithdrawalEntry({ timestamp: _blockTimestamp(), cumulativeAmount: cumulativeAmount }));
    }

    function withdrawnAmountDuringThresholdPeriod() public view returns (Decimal.decimal memory) {
        uint256 len = withdrawalHistory.length;
        if (len == 0) {
            return Decimal.zero();
        }

        uint256 durationSinceLastWithdrawal = _blockTimestamp().sub(withdrawalHistory[len - 1].timestamp);
        if (durationSinceLastWithdrawal > THRESHOLD_PERIOD) {
            return Decimal.zero();
        }

        Decimal.decimal memory withdrawn;
        for (uint256 i = len - 1; i > 0; i--) {
            Decimal.decimal memory amount = withdrawalHistory[i].cumulativeAmount.subD(
                withdrawalHistory[i - 1].cumulativeAmount
            );
            withdrawn = withdrawn.addD(amount);

            durationSinceLastWithdrawal += withdrawalHistory[i].timestamp.sub(withdrawalHistory[i - 1].timestamp);
            if (durationSinceLastWithdrawal > THRESHOLD_PERIOD) {
                break;
            }
        }
        return withdrawn;
    }

    function isOverThreshold() external view override returns (bool) {
        if (shutdownThreshold.toUint() == 0) {
            return false;
        }
        Decimal.decimal memory poolBalance = tollPool.poolBalance();
        Decimal.decimal memory withdrawn = withdrawnAmountDuringThresholdPeriod();
        return withdrawn.divD(poolBalance).cmp(shutdownThreshold) >= 0;
    }
}
