// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HemiCrazy8Token ($CRAZY8)
 * @dev ERC-20 token for Hemi Crazy 8 Game on Hemi Sepolia Testnet.
 * Features:
 * - 1,000,000,000 initial supply locked in the Airdrop Pool for new players.
 * - Gasless Admin-facilitated Airdrop: 10,000 $CRAZY8 per unique wallet.
 * - Strict On-Chain One-Time Claim enforcement (hasClaimedAirdrop mapping).
 * - Standard ERC-20 compliant with Events and Allowance mechanics.
 */
contract HemiCrazy8Token {
    string public constant name = "Hemi Crazy 8";
    string public constant symbol = "CRAZY8";
    uint8 public constant decimals = 18;

    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion tokens
    uint256 public constant AIRDROP_AMOUNT = 10_000 * 10**18;         // 10,000 tokens per player

    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // Strict on-chain Sybil protection: One claim per wallet address
    mapping(address => bool) public hasClaimedAirdrop;

    // Total tokens distributed through airdrops
    uint256 public totalAirdropped;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event AirdropDistributed(address indexed recipient, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalSupply = INITIAL_SUPPLY;
        
        // Hold the initial 1 Billion supply directly in the contract for player airdrops
        balanceOf[address(this)] = INITIAL_SUPPLY;
        emit Transfer(address(0), address(this), INITIAL_SUPPLY);
    }

    /**
     * @notice Checks if an address has already claimed their welcome airdrop.
     */
    function isEligibleForAirdrop(address account) external view returns (bool) {
        return !hasClaimedAirdrop[account] && account != address(0);
    }

    /**
     * @notice Gasless welcome airdrop: Called by the Admin Relayer to send 10,000 tokens
     * directly to a player's wallet when they connect.
     * Enforces one-claim-per-wallet on-chain.
     */
    function airdropTo(address recipient) external onlyOwner returns (bool) {
        require(recipient != address(0), "Invalid recipient address");
        require(!hasClaimedAirdrop[recipient], "Airdrop already claimed by this wallet");
        require(balanceOf[address(this)] >= AIRDROP_AMOUNT, "Airdrop pool depleted");

        hasClaimedAirdrop[recipient] = true;
        totalAirdropped += AIRDROP_AMOUNT;

        balanceOf[address(this)] -= AIRDROP_AMOUNT;
        balanceOf[recipient] += AIRDROP_AMOUNT;

        emit Transfer(address(this), recipient, AIRDROP_AMOUNT);
        emit AirdropDistributed(recipient, AIRDROP_AMOUNT);

        return true;
    }

    /**
     * @notice Batch airdrop for efficiency if needed.
     */
    function airdropBatch(address[] calldata recipients) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            if (recipient != address(0) && !hasClaimedAirdrop[recipient] && balanceOf[address(this)] >= AIRDROP_AMOUNT) {
                hasClaimedAirdrop[recipient] = true;
                totalAirdropped += AIRDROP_AMOUNT;

                balanceOf[address(this)] -= AIRDROP_AMOUNT;
                balanceOf[recipient] += AIRDROP_AMOUNT;

                emit Transfer(address(this), recipient, AIRDROP_AMOUNT);
                emit AirdropDistributed(recipient, AIRDROP_AMOUNT);
            }
        }
    }

    /**
     * @notice Standard ERC-20 transfer.
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    /**
     * @notice Standard ERC-20 approve.
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "Approve to zero address");
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Standard ERC-20 transferFrom.
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                allowance[from][msg.sender] = currentAllowance - amount;
            }
        }
        return _transfer(from, to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[from] >= amount, "ERC20: transfer amount exceeds balance");

        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }

        emit Transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Mint additional tokens if needed for testnet expansion.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Mint to zero address");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /**
     * @notice Transfer ownership of the token contract.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
