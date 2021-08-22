// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.7;

import '@openzeppelin/contracts/access/Ownable.sol';

contract Whitelistable is Ownable {
    mapping(address => bool) public whitelisted;
    bool public isWhitelistEnabled = true;

    /**
     * @dev Restrict access based on whitelist.
     *
     */
    modifier onlyWhitelist() {
        if (isWhitelistEnabled) {
            require(whitelisted[_msgSender()], "Whitelistable: You're not on the whitelist.");
        }
        _;
    }

    /**
     * @dev Add an address to the whitelist.
     *
     */
    function addToWhitelist(address[] memory asses) external onlyOwner {
        for (uint256 i = 0; i < asses.length; i++) {
            whitelisted[asses[i]] = true;
        }
    }

    /**
     * @dev Remove an address from the whitelist.
     *
     */
    function removeFromWhitelist(address[] memory asses) external onlyOwner {
        for (uint256 i = 0; i < asses.length; i++) {
            whitelisted[asses[i]] = false;
        }
    }

    /**
     * @dev set isWhitelistEnabled.
     *
     */
    function setIsWhitelistEnabled(bool _enabled) external onlyOwner {
        isWhitelistEnabled = _enabled;
    }

    /**
     * @dev public function for whitelist checks
     * coming from the frontend.
     */
    function isOnWhitelist() public view returns (bool) {
        return whitelisted[_msgSender()];
    }
}
