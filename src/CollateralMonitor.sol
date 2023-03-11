// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import { IAmm } from "./interface/IAmm.sol";
import { Decimal } from "./utils/Decimal.sol";
import { SignedDecimal } from "./utils/SignedDecimal.sol";
import { OwnerPausableUpgradeSafe } from "./OwnerPausable.sol";
import { ClearingHouse } from "./ClearingHouse.sol";

contract CollateralMonitor is OwnerPausableUpgradeSafe {
    using Decimal for Decimal.decimal;
    using SignedDecimal for SignedDecimal.signedDecimal;

    // For retrieving open positions when checking for undercollateralized positions
    struct PositionId {
        address trader;
        IAmm amm;
        bool open;
    }

    PositionId[] positionIds;
    ClearingHouse public clearingHouse;

    constructor(ClearingHouse _clearingHouse) public {
        clearingHouse = _clearingHouse;
    }

    function setPositionId(IAmm _amm, address _trader) external {
        require(_msgSender() == address(clearingHouse), "Not clearingHouse");
        uint256 idLength = positionIds.length;
        for (uint256 i = 0; i < idLength; i++) {
            if (positionIds[i].amm == _amm && positionIds[i].trader == _trader) {
                positionIds[i].open = true;
            } else {
                PositionId memory position;
                position.amm = _amm;
                position.trader = _trader;
                position.open = true;
                positionIds.push(position);
            }
        }
    }

    function clearPositionId(IAmm _amm, address _trader) external {
        require(_msgSender() == address(clearingHouse), "Not clearingHouse");
        uint256 idLength = positionIds.length;
        for (uint256 i = 0; i < idLength; i++) {
            if (positionIds[i].amm == _amm && positionIds[i].trader == _trader) {
                positionIds[i].open = false;
                return;
            }
        }
    }

    function retrieveUndercollerteralizedPositions() external view returns (PositionId[] memory) {
        PositionId[] memory toBeLiquidated = new PositionId[](positionIds.length);
        for (uint256 i = 0; i < positionIds.length; i++) {
            address trader = positionIds[i].trader;
            IAmm amm = positionIds[i].amm;

            if (positionIds[i].open) {
                SignedDecimal.signedDecimal memory marginRatio = clearingHouse.getMarginRatio(amm, trader);

                // including oracle-based margin ratio as reference price when amm is over spread limit
                if (amm.isOverSpreadLimit()) {
                    SignedDecimal.signedDecimal memory marginRatioBasedOnOracle = clearingHouse
                        ._getMarginRatioByCalcOption(amm, trader, ClearingHouse.PnlCalcOption.ORACLE);
                    if (marginRatioBasedOnOracle.subD(marginRatio).toInt() > 0) {
                        marginRatio = marginRatioBasedOnOracle;
                    }
                }
                SignedDecimal.signedDecimal memory maintainanceMarginRatio = SignedDecimal.signedDecimal(
                    int256(clearingHouse.maintenanceMarginRatio())
                );
                int256 remainingMarginRatio = marginRatio.subD(maintainanceMarginRatio).toInt();
                if (remainingMarginRatio < 0) {
                    PositionId memory positionX;
                    positionX.amm = amm;
                    positionX.trader = trader;
                    toBeLiquidated[i] = positionX;
                }
            }
        }
        return toBeLiquidated;
    }
}
