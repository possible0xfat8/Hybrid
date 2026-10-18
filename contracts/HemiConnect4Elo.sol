// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HemiConnect4Elo
 * @dev Soulbound ELO Token and On-Chain Match Settlement for Hemi Connect 4 on Hemi Sepolia
 */
contract HemiConnect4Elo {
    string public name = "HemiConnect4 ELO";
    string public symbol = "HC4ELO";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public constant DEFAULT_ELO = 1200 * 10**18;
    uint256 public constant MIN_ELO = 100 * 10**18;

    struct PlayerStats {
        uint256 elo;
        uint256 wins;
        uint256 losses;
        uint256 totalGames;
        uint256 currentStreak;
        uint256 bestStreak;
        uint256 lastPlayed;
        bool initialized;
    }

    struct MatchRecord {
        string gameId;
        address winner;
        address loser;
        uint256 winEloDelta;
        uint256 loseEloDelta;
        uint256 timestamp;
    }

    mapping(address => PlayerStats) public playerStats;
    mapping(string => bool) public recordedGames;
    MatchRecord[] public recentMatches;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event EloAdjusted(address indexed player, uint256 newElo, uint256 delta, bool isWin);
    event MatchSettled(
        string indexed gameId,
        address indexed winner,
        address indexed loser,
        uint256 winEloDelta,
        uint256 loseEloDelta,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "HemiConnect4: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "HemiConnect4: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Soulbound token: direct player transfers are disabled
    function transfer(address, uint256) external pure returns (bool) {
        revert("HemiConnect4: ELO tokens are soulbound and cannot be transferred");
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        revert("HemiConnect4: ELO tokens are soulbound and cannot be transferred");
    }

    function approve(address, uint256) external pure returns (bool) {
        revert("HemiConnect4: Approvals disabled for soulbound tokens");
    }

    function _initPlayer(address player) internal {
        if (!playerStats[player].initialized) {
            playerStats[player].initialized = true;
            playerStats[player].elo = DEFAULT_ELO;
            balanceOf[player] = DEFAULT_ELO;
            totalSupply += DEFAULT_ELO;
            emit Transfer(address(0), player, DEFAULT_ELO);
        }
    }

    function recordMatch(
        string calldata gameId,
        address winner,
        address loser,
        uint256 winEloDelta,
        uint256 loseEloDelta
    ) external onlyOwner {
        require(bytes(gameId).length > 0, "HemiConnect4: empty gameId");
        require(!recordedGames[gameId], "HemiConnect4: game already recorded");
        require(winner != address(0) && loser != address(0), "HemiConnect4: zero address");
        require(winner != loser, "HemiConnect4: winner cannot be loser");

        recordedGames[gameId] = true;

        _initPlayer(winner);
        _initPlayer(loser);

        // Adjust winner ELO
        playerStats[winner].elo += winEloDelta;
        playerStats[winner].wins += 1;
        playerStats[winner].totalGames += 1;
        playerStats[winner].currentStreak += 1;
        if (playerStats[winner].currentStreak > playerStats[winner].bestStreak) {
            playerStats[winner].bestStreak = playerStats[winner].currentStreak;
        }
        playerStats[winner].lastPlayed = block.timestamp;
        balanceOf[winner] += winEloDelta;
        totalSupply += winEloDelta;
        emit Transfer(address(0), winner, winEloDelta);
        emit EloAdjusted(winner, playerStats[winner].elo, winEloDelta, true);

        // Adjust loser ELO (cannot fall below MIN_ELO)
        uint256 actualBurn = loseEloDelta;
        if (playerStats[loser].elo <= MIN_ELO + loseEloDelta) {
            actualBurn = playerStats[loser].elo > MIN_ELO ? playerStats[loser].elo - MIN_ELO : 0;
            playerStats[loser].elo = MIN_ELO;
        } else {
            playerStats[loser].elo -= loseEloDelta;
        }
        playerStats[loser].losses += 1;
        playerStats[loser].totalGames += 1;
        playerStats[loser].currentStreak = 0;
        playerStats[loser].lastPlayed = block.timestamp;
        
        if (actualBurn > 0) {
            balanceOf[loser] -= actualBurn;
            totalSupply -= actualBurn;
            emit Transfer(loser, address(0), actualBurn);
        }
        emit EloAdjusted(loser, playerStats[loser].elo, actualBurn, false);

        // Store match record
        recentMatches.push(MatchRecord({
            gameId: gameId,
            winner: winner,
            loser: loser,
            winEloDelta: winEloDelta,
            loseEloDelta: actualBurn,
            timestamp: block.timestamp
        }));

        emit MatchSettled(gameId, winner, loser, winEloDelta, actualBurn, block.timestamp);
    }

    function adjustElo(address player, uint256 amount, bool isWin) external onlyOwner {
        require(player != address(0), "HemiConnect4: zero address");
        require(amount > 0, "HemiConnect4: amount must be > 0");

        _initPlayer(player);

        if (isWin) {
            playerStats[player].elo += amount;
            balanceOf[player] += amount;
            totalSupply += amount;
            emit Transfer(address(0), player, amount);
        } else {
            uint256 actualBurn = amount;
            if (playerStats[player].elo <= MIN_ELO + amount) {
                actualBurn = playerStats[player].elo > MIN_ELO ? playerStats[player].elo - MIN_ELO : 0;
                playerStats[player].elo = MIN_ELO;
            } else {
                playerStats[player].elo -= amount;
            }
            if (actualBurn > 0) {
                balanceOf[player] -= actualBurn;
                totalSupply -= actualBurn;
                emit Transfer(player, address(0), actualBurn);
            }
        }

        emit EloAdjusted(player, playerStats[player].elo, amount, isWin);
    }

    function getPlayer(address player) external view returns (
        uint256 elo,
        uint256 wins,
        uint256 losses,
        uint256 totalGames,
        uint256 currentStreak,
        uint256 bestStreak,
        uint256 lastPlayed
    ) {
        if (!playerStats[player].initialized) {
            return (DEFAULT_ELO, 0, 0, 0, 0, 0, 0);
        }
        PlayerStats memory p = playerStats[player];
        return (p.elo, p.wins, p.losses, p.totalGames, p.currentStreak, p.bestStreak, p.lastPlayed);
    }

    function getRecentMatchesCount() external view returns (uint256) {
        return recentMatches.length;
    }

    function getRecentMatches(uint256 limit) external view returns (MatchRecord[] memory) {
        uint256 total = recentMatches.length;
        if (total == 0) return new MatchRecord[](0);
        uint256 count = limit > total ? total : limit;
        MatchRecord[] memory result = new MatchRecord[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = recentMatches[total - 1 - i];
        }
        return result;
    }
}
