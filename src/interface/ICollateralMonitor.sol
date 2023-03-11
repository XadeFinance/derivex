// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import { IAmm } from "./IAmm.sol";

interface ICollateralMonitor {
    struct PositionId {
        address trader;
        IAmm amm;
        bool open;
    }

    function retrieveUndercollerteralizedPositions() external view returns (PositionId[] memory);

    function setPositionId(IAmm _amm, address _trader) external;

    function clearPositionId(IAmm _amm, address _trader) external;
}
