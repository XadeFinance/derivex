// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import { XadeOwnableUpgrade } from "./utils/XadeOwnableUpgrade.sol";
// prettier-ignore
// solhint-disable-next-line
import {
    ReentrancyGuardUpgradeSafe
} from "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import { Decimal } from "./utils/Decimal.sol";
import { DecimalERC20 } from "./utils/DecimalERC20.sol";
import { AddressArray } from "./utils/AddressArray.sol";
import { IInsuranceFund } from "./interface/IInsuranceFund.sol";
import { IInflationMonitor } from "./interface/IInflationMonitor.sol";
import { IMultiTokenRewardRecipient } from "./interface/IMultiTokenRewardRecipient.sol";

contract FeePool is XadeOwnableUpgrade, ReentrancyGuardUpgradeSafe, DecimalERC20, IMultiTokenRewardRecipient {
    using Decimal for Decimal.decimal;
    using AddressArray for address[];

    // EVENTS
    //

    event Withdrawn(address withdrawer, IERC20 token, uint256 amount);
    event FeeTokenAdded(address tokenAddress);
    event FeeTokenRemoved(address tokenAddress);
    event FeePoolOperatorSet(address feePoolOperator);

    //**********************************************************//
    //    The below state variables can not change the order    //
    //**********************************************************//
    mapping(address => bool) private feeTokenMap;
    address[] public feeTokens;

    // contract dependencies
    IInsuranceFund public InsuranceFund;
    IInflationMonitor public inflationMonitor;
    address public feePoolOperator;

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
        __ReentrancyGuard_init();
    }

    function notifyTokenAmount(IERC20 _token, Decimal.decimal calldata _amount) external override {
        require(_amount.toUint() != 0, "invalid amount");
        if (!feeTokenMap[address(_token)]) {
            addFeeToken(_token);
        }
    }

    function transferToFeePoolOperator() external {
        require(address(feePoolOperator) != address(0), "feePoolOperator not yet set");
        require(feeTokens.length != 0, "feeTokens not set yet");

        bool hasToll;
        for (uint256 i; i < feeTokens.length; i++) {
            IERC20 token = IERC20(feeTokens[i]);
            hasToll = _transferToOperator(token) || hasToll;
        }
        // revert if total fee of all tokens is zero
        require(hasToll, "fee is now zero");
    }

    /**
     * @notice withdraw token to insurance fund to cover for unexpected loss
     * @param _token the token to be withdrawn
     * @param _amount the amount of token caller want to withdraw
     */
    function withdrawToInsuranceFund(IERC20 _token, Decimal.decimal calldata _amount) external override {
        require(address(InsuranceFund) == _msgSender(), "caller is not Insurance Fund");
        require(isFeeTokenExisted(_token), "Asset is not avalible");

        _transfer(_token, address(InsuranceFund), _amount);
        inflationMonitor.appendToWithdrawalHistory(_amount);
        emit Withdrawn(_msgSender(), _token, _amount.toUint());
    }

    /** @notice withdraw a specific amount of the token
     * @param _token the token to be withdrawn
     * @param _amount the amount of token caller want to withdraw
     */
    function withdraw(IERC20 _token, Decimal.decimal calldata _amount) external onlyOwner {
        require(isFeeTokenExisted(_token), "Asset not avalible");

        _transfer(_token, address(feePoolOperator), _amount);
        emit Withdrawn(_msgSender(), _token, _amount.toUint());
    }

    function addFeeToken(IERC20 _token) internal {
        require(feeTokens.add(address(_token)), "invalid input");

        emit FeeTokenAdded(address(_token));
    }

    function removeFeeToken(IERC20 _token) external onlyOwner {
        address removedAddr = feeTokens.remove(address(_token));
        require(removedAddr != address(0), "token does not exist");
        require(removedAddr == address(_token), "remove wrong token");

        if (_token.balanceOf(address(this)) > 0) {
            _transferToOperator(_token);
        }
        emit FeeTokenRemoved(address(_token));
    }

    // SETTERS

    function setInsuranceFund(IInsuranceFund _insuranceFund) external onlyOwner {
        InsuranceFund = _insuranceFund;
    }

    function setInflationMonitor(IInflationMonitor _inflationMonitor) external onlyOwner {
        inflationMonitor = _inflationMonitor;
    }

    function setFeePoolOperator(address _feePoolOperator) external onlyOwner {
        require(_feePoolOperator != address(0), "invalid input");
        require(_feePoolOperator != feePoolOperator, "input is the same as the current one");
        feePoolOperator = _feePoolOperator;
        emit FeePoolOperatorSet(_feePoolOperator);
    }

    // INTERNAL FUNCTIONS

    function _transferToOperator(IERC20 _token) private returns (bool) {
        Decimal.decimal memory balance = _balanceOf(_token, address(this));
        if (balance.toUint() != 0) {
            _transfer(_token, address(feePoolOperator), balance);
            emit Withdrawn(address(feePoolOperator), _token, balance.toUint());
            return true;
        }
        return false;
    }

    // VIEW FUNCTIONS

    function isFeeTokenExisted(IERC20 _token) public view returns (bool) {
        return feeTokens.isExisted(address(_token));
    }

    function getFeeTokenLength() external view returns (uint256) {
        return feeTokens.length;
    }

    function balanceOf(IERC20 _token) internal view returns (Decimal.decimal memory) {
        return _balanceOf(_token, address(this));
    }

    function poolBalance() external view override returns (Decimal.decimal memory) {
        if (feeTokens.length == 0) {
            return Decimal.zero();
        }
        Decimal.decimal memory balance;
        for (uint256 i = 0; i <= feeTokens.length; i++) {
            balance = Decimal.addD(balance, balanceOf(IERC20(feeTokens[i])));
        }
        return balance;
    }
}
