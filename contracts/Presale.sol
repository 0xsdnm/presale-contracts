// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.7;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './libraries/TransferHelper.sol';
import './libraries/Whitelistable.sol';
import './interfaces/IDEXRouter.sol';

contract Presale is Ownable, Whitelistable, ReentrancyGuard {
    using SafeMath for uint256;

    event TokensPurchased(address indexed buyer, uint256 indexed amount);
    event TokensClaimed(address indexed buyer, uint256 indexed amount);
    event TokensReleased(address indexed buyer, uint256 indexed amount);
    event SaleFinalized();

    uint256 public presalePrice;
    uint256 public launchPrice;
    address public tokenOut;
    uint256 public startDate;
    uint256 public endDate;
    uint256 public minCommitment;
    uint256 public maxCommitment;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public tokensSold;
    uint256 public tokensForLiquidity;
    address public router;
    bool public isFinalized;
    bool public isAddLiquidityEnabled;
    address public tokenContract;

    mapping(address => uint256) public tokensPurchased;

    /**
     * @dev Restricts access to a time between the startDate and the endDate.
     *
     */
    modifier isActive() {
        require(block.timestamp > startDate, 'Presale: too early!');
        require(block.timestamp < endDate, 'Presale: too late!');
        _;
    }

    constructor(
        uint256 _startDate,
        uint256 _endDate,
        uint256 _minCommitment,
        uint256 _maxCommitment,
        uint256 _softCap,
        uint256 _hardCap,
        address _tokenOut,
        uint256 _presalePrice,
        uint256 _launchPrice,
        address _router,
        bool _isAddLiquidityEnabled
    ) {
        require(_softCap < _hardCap, 'Presale: softCap cannot be higher than hardCap');
        require(_startDate < _endDate, 'Presale: startDate cannot be after endDate');
        require(_endDate > block.timestamp, 'Presale: endDate must be in the future');
        require(_minCommitment > 0, 'Presale: minCommitment must be higher than 0');
        require(_minCommitment < _maxCommitment, 'Presale: minCommitment cannot be higher than maxCommitment');

        startDate = _startDate;
        endDate = _endDate;
        minCommitment = _minCommitment;
        maxCommitment = _maxCommitment;
        softCap = _softCap;
        hardCap = _hardCap;
        tokenOut = _tokenOut;
        presalePrice = _presalePrice;
        launchPrice = _launchPrice;
        router = _router;
        isAddLiquidityEnabled = _isAddLiquidityEnabled;
    }

    /**
     * @dev purchase tokens for a fixed price
     *
     */
    function purchaseTokens() external payable isActive onlyWhitelist {
        require(!isFinalized, 'Presale: sale finalized');
        uint256 amount = msg.value;
        require(amount >= minCommitment, 'Presale: amount too low');
        require(tokensPurchased[msg.sender].add(amount) <= maxCommitment, 'Presale: maxCommitment reached');
        require(tokensSold.add(amount) <= hardCap, 'Presale: hardcap reached');

        tokensSold = tokensSold.add(amount);
        tokensPurchased[msg.sender] = tokensPurchased[msg.sender].add(amount);
        emit TokensPurchased(msg.sender, amount);
    }

    /**
     * @dev finalize sale if minRaise is reached
     *
     */
    function finalizeSale() external onlyOwner {
        require(!isFinalized, 'Presale: already finalized');
        require(
            block.timestamp > endDate || tokensSold == hardCap,
            'Presale: endDate not passed or hardcap not reached'
        );
        require(tokensSold >= softCap, 'Presale: softCap not reached');
        isFinalized = true;
        if (isAddLiquidityEnabled) {
            addLiquidity(_msgSender());
        }

        emit SaleFinalized();
    }

    function addLiquidity(address lpOwner) private {
        require(isFinalized, 'Presale: must be finalized');
        require(tokenOut != address(0), 'Presale: tokenOut is not valid');
        uint256 tokenLaunchAmount = tokensSold.mul(launchPrice).div(1e9);
        uint256 tokenPresaleAmount = tokensSold.mul(presalePrice).div(1e9);
        uint256 tokenRequiredAmount = tokenLaunchAmount.add(tokenPresaleAmount);
        uint256 tokenBalance = IERC20(tokenOut).balanceOf(address(this));
        require(tokenBalance > 0, 'Presale: token balance must be positive');
        require(tokenRequiredAmount <= tokenBalance, 'Presale: not enough token balance');
        require(tokensSold <= address(this).balance, 'Presale: not enough balance');

        IERC20(tokenOut).approve(router, tokenLaunchAmount);
        IDEXRouter(router).addLiquidityETH{value: tokensSold}(
            tokenOut,
            tokenLaunchAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            lpOwner,
            block.timestamp + 360
        );
    }

    function setTokenOut(address _tokenOut) external onlyOwner {
        tokenOut = _tokenOut;
    }

    function setPresalePrice(uint256 _presalePrice) external onlyOwner {
        require(_presalePrice > 0, 'Presale: presalePrice must be positive');
        presalePrice = _presalePrice;
    }

    function setLaunchPrice(uint256 _launchPrice) external onlyOwner {
        require(_launchPrice > 0, 'Presale: launchPrice must be positive');
        launchPrice = _launchPrice;
    }

    function setStartDate(uint256 _startDate) external onlyOwner {
        require(_startDate < endDate, 'Presale: invalid startDate');
        startDate = _startDate;
    }

    function setEndDate(uint256 _endDate) external onlyOwner {
        require(_endDate > startDate, 'Presale: invalid endDate');
        endDate = _endDate;
    }

    function setIsAddLiquidityEnabled(bool _enabled) external onlyOwner {
        isAddLiquidityEnabled = _enabled;
    }

    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), 'Presale: invalid router');
        router = _router;
    }

    /**
     * @dev let investors claim their purchased tokens
     *
     */
    function claimTokens() external nonReentrant {
        require(isFinalized, 'Presale: sale not finalized');
        require(tokensPurchased[msg.sender] > 0, 'Presale: no tokens to claim');
        uint256 purchasedTokens = tokensPurchased[msg.sender].mul(presalePrice).div(1e9);
        tokensPurchased[msg.sender] = 0;
        TransferHelper.safeTransfer(address(tokenOut), msg.sender, purchasedTokens);
        emit TokensClaimed(msg.sender, purchasedTokens);
    }

    /**
     * @dev realease tokenIn back to investors if softCap not reached
     *
     */
    function releaseTokens() external nonReentrant {
        require(!isFinalized, 'Presale: cannot release tokens for finalized sale');
        require(softCap > 0, 'Presale: no softCap');
        require(block.timestamp > endDate, 'Presale: endDate not passed');
        require(tokensPurchased[msg.sender] > 0, 'Presale: no tokens to release');
        require(tokensSold < softCap, 'Presale: softCap reached');

        uint256 purchasedTokens = tokensPurchased[msg.sender];
        tokensPurchased[msg.sender] = 0;
        TransferHelper.safeTransferETH(msg.sender, purchasedTokens);
        emit TokensReleased(msg.sender, purchasedTokens);
    }

    /**
     * @dev to get remaining token at any point of the sale
     *
     */
    function tokensRemaining() external view returns (uint256) {
        return (hardCap.sub(tokensSold).mul(presalePrice).div(1e9));
    }

    /**
     * @dev to get remaining bnb at any point of the sale
     *
     */
    function bnbRemaining() external view returns (uint256) {
        return hardCap.sub(tokensSold);
    }

    /**
     * @dev Returns the time left to endDate in seconds.
     *
     */
    function getTimeLeftEndDate() external view returns (uint256) {
        if (block.timestamp > endDate) {
            return 0;
        } else {
            return endDate.sub(block.timestamp);
        }
    }

    function getReservedTokens() external view returns (uint256) {
        if (tokensPurchased[msg.sender] > 0) {
            return tokensPurchased[msg.sender].mul(presalePrice).div(1e9);
        } else {
            return 0;
        }
    }

    /**
     * @dev Withdraw BNB that somehow ended up in the contract.
     *
     */
    function withdrawBnb() external onlyOwner {
        payable(_msgSender()).transfer(address(this).balance);
    }

    /**
     * @dev Withdraw any erc20 compliant tokens that
     * somehow ended up in the contract.
     *
     */
    function withdrawErc20Token(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }

    receive() external payable {}
}
