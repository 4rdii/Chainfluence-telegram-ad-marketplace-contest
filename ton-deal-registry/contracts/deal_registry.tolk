// Deal Registry Contract
// Stores ad deal terms on-chain. Only TEE (admin) can create deals.
// Contract does NOT hold funds - TEE HD wallets handle escrow.

import "@stdlib/tvm-dicts"

// Storage layout:
// - admin: MsgAddress (TEE address, set once at deploy, immutable)
// - next_deal_id: uint64
// - deals: Dictionary<uint64, Cell>

// Deal structure (stored in cell):
// - channel_id: int64 (Telegram channel ID)
// - post_id: int64 (Telegram message ID)
// - content_hash: uint256 (hash of ad content)
// - duration: uint32 (seconds ad must stay up)
// - publisher: MsgAddress
// - advertiser: MsgAddress
// - amount: Coins (deal amount in nanoTON)
// - posted_at: uint32 (timestamp when posted)
// - created_at: uint32 (timestamp when registered on-chain)

// Op codes
const OP_CREATE_DEAL: int = 0x1;

// Error codes
const ERROR_UNAUTHORIZED: int = 401;
const ERROR_DEAL_EXISTS: int = 409;
const ERROR_DEAL_NOT_FOUND: int = 404;

// Global storage
global admin: address;
global nextDealId: int;
global deals: dict;

// Load contract storage
fun loadData() {
    var ds = contract.getData().beginParse();
    admin = ds.loadAddress();
    nextDealId = ds.loadUint(64);
    deals = ds.loadMaybeRef();
}

// Save contract storage
fun saveData() {
    contract.setData(
        beginCell()
            .storeAddress(admin)
            .storeUint(nextDealId, 64)
            .storeMaybeRef(deals)
            .endCell()
    );
}

// Pack deal data into a cell (split across main cell and ref due to size limits)
// Main cell: channelId, postId, contentHash, duration, postedAt, createdAt
// Ref cell: publisher, advertiser, amount
fun packDeal(
    channelId: int,
    postId: int,
    contentHash: int,
    duration: int,
    publisher: address,
    advertiser: address,
    amount: int,
    postedAt: int,
    createdAt: int
): cell {
    var addrCell = beginCell()
        .storeAddress(publisher)
        .storeAddress(advertiser)
        .storeCoins(amount)
        .endCell();

    return beginCell()
        .storeInt(channelId, 64)
        .storeInt(postId, 64)
        .storeUint(contentHash, 256)
        .storeUint(duration, 32)
        .storeUint(postedAt, 32)
        .storeUint(createdAt, 32)
        .storeRef(addrCell)
        .endCell();
}

// Main entry point for internal messages
fun onInternalMessage(msgFull: cell, msgBody: slice) {
    // Parse message
    var cs = msgFull.beginParse();
    var flags = cs.loadUint(4);

    // Ignore bounced messages
    if (flags & 1) {
        return;
    }

    var sender = cs.loadAddress();

    // Empty message - just accept TON for gas
    if (msgBody.isEmpty()) {
        return;
    }

    // Load storage
    loadData();

    // Parse operation
    var op = msgBody.loadUint(32);

    if (op == OP_CREATE_DEAL) {
        // Only admin (TEE) can create deals
        assert(sender == admin, ERROR_UNAUTHORIZED);

        // Parse deal data (split across main cell and ref due to size limits)
        var dealId = msgBody.loadUint(64);
        var channelId = msgBody.loadInt(64);
        var postId = msgBody.loadInt(64);
        var contentHash = msgBody.loadUint(256);
        var duration = msgBody.loadUint(32);

        // Load addresses and amounts from referenced cell
        var addrCell = msgBody.loadRef().beginParse();
        var publisher = addrCell.loadAddress();
        var advertiser = addrCell.loadAddress();
        var amount = addrCell.loadCoins();
        var postedAt = addrCell.loadUint(32);

        // Check deal doesn't already exist
        var (_, found) = deals.uDictGet(64, dealId);
        assert(!found, ERROR_DEAL_EXISTS);

        // Create deal cell
        var dealCell = packDeal(
            channelId,
            postId,
            contentHash,
            duration,
            publisher,
            advertiser,
            amount,
            postedAt,
            blockchain.now()
        );

        // Store deal
        deals.uDictSetRef(64, dealId, dealCell);

        // Update next_deal_id if needed
        if (dealId >= nextDealId) {
            nextDealId = dealId + 1;
        }

        // Save storage
        saveData();

        return;
    }

    // Unknown operation
    throw 0xffff;
}

// Getter: Get deal by ID
// Returns: (channelId, postId, contentHash, duration, publisher, advertiser, amount, postedAt, createdAt)
get fun getDeal(dealId: int): (int, int, int, int, address, address, int, int, int) {
    loadData();

    var (dealCell, found) = deals.uDictGetRef(64, dealId);
    assert(found, ERROR_DEAL_NOT_FOUND);

    // Main cell: channelId, postId, contentHash, duration, postedAt, createdAt
    var ds = dealCell!.beginParse();
    var channelId = ds.loadInt(64);
    var postId = ds.loadInt(64);
    var contentHash = ds.loadUint(256);
    var duration = ds.loadUint(32);
    var postedAt = ds.loadUint(32);
    var createdAt = ds.loadUint(32);

    // Ref cell: publisher, advertiser, amount
    var addrCell = ds.loadRef().beginParse();
    var publisher = addrCell.loadAddress();
    var advertiser = addrCell.loadAddress();
    var amount = addrCell.loadCoins();

    return (channelId, postId, contentHash, duration, publisher, advertiser, amount, postedAt, createdAt);
}

// Getter: Get next deal ID
get fun getNextDealId(): int {
    loadData();
    return nextDealId;
}

// Getter: Get admin address
get fun getAdmin(): address {
    loadData();
    return admin;
}

// Getter: Check if deal exists
get fun dealExists(dealId: int): int {
    loadData();
    var (_, found) = deals.uDictGet(64, dealId);
    return found ? -1 : 0;
}
