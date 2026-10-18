// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/**
 * @title HemiCrazy8Escrow
 * @dev Manages table buy-in bets, pot escrows, 95% winner payouts, and 5% house board fees
 * for the Hemi Crazy 8 game on Hemi Sepolia Testnet.
 */
contract HemiCrazy8Escrow {
    IERC20 public immutable token;
    address public owner;
    address public treasury;

    // 5% board fee (500 basis points / 10,000)
    uint256 public constant HOUSE_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10000;

    struct Game {
        bytes32 gameId;
        uint256 totalPot;
        uint256 buyInPerPlayer;
        address[] players;
        address winner;
        bool isSettled;
        bool isCancelled;
        uint256 createdAt;
        uint256 settledAt;
    }

    mapping(bytes32 => Game) public games;
    mapping(bytes32 => mapping(address => bool)) public hasDeposited;

    // Total stats tracked on-chain
    uint256 public totalGamesSettled;
    uint256 public totalVolumeDistributed;
    uint256 public totalFeesCollected;

    // Simple reentrancy guard
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    event BuyInDeposited(bytes32 indexed gameId, address indexed player, uint256 amount, uint256 totalPot);
    event GameSettled(
        bytes32 indexed gameId,
        address indexed winner,
        uint256 totalPot,
        uint256 winnerPayout,
        uint256 feeAmount,
        uint256 settledAt
    );
    event GameCancelled(bytes32 indexed gameId, uint256 totalRefunded);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner/admin can call this");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor(address _tokenAddress, address _treasury) {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_treasury != address(0), "Invalid treasury address");

        token = IERC20(_tokenAddress);
        owner = msg.sender;
        treasury = _treasury;
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Deposit player buy-in for a match table.
     * @param gameId Unique identifier for the match table.
     * @param amount Buy-in amount in token wei.
     */
    function depositBuyIn(bytes32 gameId, uint256 amount) external nonReentrant {
        require(amount > 0, "Buy-in amount must be greater than 0");
        Game storage game = games[gameId];
        require(!game.isSettled, "Game already settled");
        require(!game.isCancelled, "Game was cancelled");
        require(!hasDeposited[gameId][msg.sender], "Player already deposited for this game");

        // Initialize game on first deposit
        if (game.players.length == 0) {
            game.gameId = gameId;
            game.buyInPerPlayer = amount;
            game.createdAt = block.timestamp;
        } else {
            require(amount == game.buyInPerPlayer, "Buy-in amount mismatch for this game");
        }

        hasDeposited[gameId][msg.sender] = true;
        game.players.push(msg.sender);
        game.totalPot += amount;

        // Pull tokens into escrow
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        emit BuyInDeposited(gameId, msg.sender, amount, game.totalPot);
    }

    /**
     * @notice Automated admin settlement: Resolves the match, pays 95% to the winner
     * and 5% board fee to the treasury. Gas is paid by the admin relayer so the winner
     * receives their winnings automatically!
     */
    function settleGame(bytes32 gameId, address winner) external onlyOwner nonReentrant {
        require(winner != address(0), "Invalid winner address");
        Game storage game = games[gameId];
        require(!game.isSettled, "Game already settled");
        require(!game.isCancelled, "Game was cancelled");
        require(game.totalPot > 0, "No pot to settle");

        uint256 pot = game.totalPot;
        uint256 fee = (pot * HOUSE_FEE_BPS) / BPS_DENOMINATOR; // 5%
        uint256 payout = pot - fee;                             // 95%

        game.isSettled = true;
        game.winner = winner;
        game.settledAt = block.timestamp;

        totalGamesSettled += 1;
        totalVolumeDistributed += payout;
        totalFeesCollected += fee;

        // Payout 95% to winner
        require(token.transfer(winner, payout), "Transfer to winner failed");

        // Transfer 5% board fee to house treasury
        if (fee > 0) {
            require(token.transfer(treasury, fee), "Transfer of board fee failed");
        }

        emit GameSettled(gameId, winner, pot, payout, fee, block.timestamp);
    }

    /**
     * @notice Cancels an unfinished or abandoned game and refunds all deposited players.
     */
    function cancelGameAndRefund(bytes32 gameId) external onlyOwner nonReentrant {
        Game storage game = games[gameId];
        require(!game.isSettled, "Cannot cancel settled game");
        require(!game.isCancelled, "Game already cancelled");
        require(game.totalPot > 0, "No pot to refund");

        game.isCancelled = true;
        uint256 totalRefunded = game.totalPot;
        uint256 refundPerPlayer = game.buyInPerPlayer;

        for (uint256 i = 0; i < game.players.length; i++) {
            address player = game.players[i];
            if (hasDeposited[gameId][player]) {
                hasDeposited[gameId][player] = false;
                require(token.transfer(player, refundPerPlayer), "Refund transfer failed");
            }
        }

        game.totalPot = 0;
        emit GameCancelled(gameId, totalRefunded);
    }

    /**
     * @notice Get game details for client inspection.
     */
    function getGameDetails(bytes32 gameId)
        external
        view
        returns (
            uint256 totalPot,
            uint256 buyInPerPlayer,
            uint256 playerCount,
            address winner,
            bool isSettled,
            bool isCancelled,
            uint256 winnerPayout,
            uint256 feeAmount
        )
    {
        Game storage game = games[gameId];
        uint256 fee = (game.totalPot * HOUSE_FEE_BPS) / BPS_DENOMINATOR;
        uint256 payout = game.totalPot - fee;

        return (
            game.totalPot,
            game.buyInPerPlayer,
            game.players.length,
            game.winner,
            game.isSettled,
            game.isCancelled,
            payout,
            fee
        );
    }

    function getGamePlayers(bytes32 gameId) external view returns (address[] memory) {
        return games[gameId].players;
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury");
        emit TreasuryUpdated(treasury, _newTreasury);
        treasury = _newTreasury;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
