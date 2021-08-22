// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.7;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20 is ERC20('MockERC20', 'MERC20') {
    uint8 _decimals;

    constructor(uint8 decimals_, uint256 _totalSupply) {
        _decimals = decimals_;
        _mint(msg.sender, _totalSupply);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
