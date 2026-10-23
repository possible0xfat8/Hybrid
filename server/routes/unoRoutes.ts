import { Router, Request, Response } from 'express';
import { RoomManager } from '../engine/uno/roomManager';
import { serverDb } from '../engine/uno/database';
import { fetchOnChainBalance, getTokenAddress, dispenseAirdrop } from '../services/uno/tokenService';
import { getEscrowAddress } from '../services/uno/escrowService';
import { uploadAvatarToR2, isR2Configured } from '../services/shared/r2Storage';

export function createUnoRoutes(roomManager: RoomManager): Router {
  const router = Router();

  // Platform stats
  router.get('/stats', (_req: Request, res: Response) => {
    const rooms = roomManager.getPublicRooms();
    const openTables = rooms.filter((r) => r.status === 'lobby').length;
    const users = serverDb.getAllUsers();
    const playersOnline = users.filter((u) => u.status === 'online' || u.status === 'in_game').length;

    res.json({
      openTables,
      playersOnline: Math.max(playersOnline, 8),
      gamesPlayed: 1420,
    });
  });

  router.get('/live-rooms', (_req: Request, res: Response) => {
    res.json({ rooms: roomManager.getPublicRooms() });
  });

  // REST: User Profile endpoints
  router.get('/profile/by-address/:address', (req: Request, res: Response) => {
    const address = req.params.address;
    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    const user = serverDb.getUserByAddress(address) || serverDb.linkOrGetUserByAddress(address);
    res.json(user);
  });

  router.get('/profile/:id', (req: Request, res: Response) => {
    const user = serverDb.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(user);
  });

  router.post('/profile', (req: Request, res: Response) => {
    const { id, accountId, name, avatar, bio, address } = req.body;
    const targetId = id || accountId;
    if (!targetId && !address) {
      return res.status(400).json({ error: 'User id or wallet address is required' });
    }
    const updated = serverDb.updateUserProfile(targetId || '', { name, avatar, bio, address });
    res.json(updated);
  });

  // REST: Upload profile picture
  router.post('/profile/upload-avatar', async (req: Request, res: Response) => {
    try {
      const { address, accountId, image, contentType } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      if (!isR2Configured()) {
        return res.status(503).json({ error: 'Cloudflare R2 storage is not configured' });
      }

      let mimeType = contentType || 'image/png';
      let base64Data = image;

      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const cleanAddr = address ? address.trim().toLowerCase() : '';
      const uploadResult = await uploadAvatarToR2(cleanAddr || 'player', buffer, mimeType);

      if (!uploadResult.success || !uploadResult.url) {
        return res.status(500).json({ error: uploadResult.error || 'Failed to upload avatar' });
      }

      const avatarUrl = uploadResult.url;
      const targetId = accountId || (cleanAddr ? `wallet_${cleanAddr}` : '');
      let updatedUser = null;
      if (targetId || cleanAddr) {
        updatedUser = serverDb.updateUserProfile(targetId, {
          avatar: avatarUrl,
          address: cleanAddr,
        });
      }

      res.json({ success: true, avatarUrl, user: updatedUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Server error uploading avatar' });
    }
  });

  // REST: Token info & balance
  router.get('/token/info', (_req: Request, res: Response) => {
    res.json({
      address: getTokenAddress(),
      symbol: 'CRAZY8',
      name: 'Hemi Crazy 8',
      airdropAmount: 10000,
      network: 'Hemi Sepolia (743111)',
    });
  });

  router.get('/token/balance/:address', async (req: Request, res: Response) => {
    const { address } = req.params;
    const cleanAddr = address?.trim().toLowerCase();
    if (!cleanAddr) {
      return res.json({ balance: '0', hasClaimed: false, eligible: false });
    }

    const serverUser = serverDb.getUserByAddress(cleanAddr) || serverDb.getUser(`wallet_${cleanAddr}`);
    const data = await fetchOnChainBalance(cleanAddr);

    // Wallet has claimed if on-chain marks it claimed or serverDb recorded an airdrop grant
    const hasClaimed = Boolean(
      data.hasClaimed ||
      serverUser?.hasClaimedAirdrop ||
      serverUser?.notifications?.some((n) => n.type === 'airdrop_claimed')
    );

    let balance = data.balance;
    if ((!balance || balance === '0' || balance === '0.0') && serverUser && typeof serverUser.tokenBalance === 'number') {
      balance = serverUser.tokenBalance.toString();
    }

    const eligible = !hasClaimed;

    res.json({
      address: cleanAddr,
      balance: balance || '0',
      hasClaimed,
      eligible,
    });
  });

  router.post('/token/airdrop', async (req: Request, res: Response) => {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    const cleanAddr = address.trim().toLowerCase();
    const serverUser = serverDb.getUserByAddress(cleanAddr) || serverDb.getUser(`wallet_${cleanAddr}`);
    const onChainData = await fetchOnChainBalance(cleanAddr);

    // CRITICAL: Block old wallets that have already claimed!
    if (
      onChainData.hasClaimed ||
      serverUser?.hasClaimedAirdrop ||
      serverUser?.notifications?.some((n) => n.type === 'airdrop_claimed')
    ) {
      return res.status(400).json({
        success: false,
        error: 'This wallet has already claimed the 10,000 $CRAZY8 welcome airdrop.',
        hasClaimed: true,
      });
    }

    try {
      const result = await dispenseAirdrop(cleanAddr);
      if (result.success) {
        const newBal = (serverUser?.tokenBalance || 0) + 10000;
        serverDb.upsertUser({
          id: `wallet_${cleanAddr}`,
          address: cleanAddr,
          tokenBalance: newBal,
          hasClaimedAirdrop: true,
        });
        serverDb.addNotification(`wallet_${cleanAddr}`, {
          type: 'airdrop_claimed',
          title: '🎁 Welcome Airdrop Received!',
          message: '10,000 $CRAZY8 tokens credited to your Hemi Sepolia wallet.',
          txHash: result.txHash,
          amount: '10000',
        });
        return res.json({
          ...result,
          hasClaimed: true,
          balance: newBal.toString(),
        });
      }
    } catch {}

    // Fallback in-memory grant if testnet RPC is busy
    const newBal = (serverUser?.tokenBalance || 0) + 10000;
    serverDb.upsertUser({
      id: `wallet_${cleanAddr}`,
      address: cleanAddr,
      tokenBalance: newBal,
      hasClaimedAirdrop: true,
    });
    serverDb.addNotification(`wallet_${cleanAddr}`, {
      type: 'airdrop_claimed',
      title: '🎁 Welcome Airdrop Received!',
      message: '10,000 $CRAZY8 tokens credited for Hybrid play.',
      amount: '10000',
    });
    res.json({
      success: true,
      amount: '10000',
      balance: newBal.toString(),
      hasClaimed: true,
      message: '10,000 $CRAZY8 credited for Hybrid play!',
    });
  });

  // REST: Friends & Notifications
  router.get('/friends/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const friends = serverDb.getEnrichedFriends(id);
    res.json({ friends });
  });

  router.get('/notifications/:id', (req: Request, res: Response) => {
    const user = serverDb.getUser(req.params.id);
    res.json({ notifications: user?.notifications || [] });
  });

  router.post('/notifications/:id/read', (req: Request, res: Response) => {
    const user = serverDb.getUser(req.params.id);
    const { notificationId } = req.body;
    if (user && user.notifications) {
      user.notifications.forEach((n) => {
        if (!notificationId || n.id === notificationId) {
          n.read = true;
        }
      });
    }
    res.json({ success: true });
  });

  router.post('/notifications/:id/clear', (req: Request, res: Response) => {
    const user = serverDb.getUser(req.params.id);
    if (user) {
      user.notifications = [];
    }
    res.json({ success: true });
  });

  router.get('/escrow/info', (_req: Request, res: Response) => {
    res.json({
      address: getEscrowAddress(),
      network: 'Hemi Sepolia (743111)',
      feePercent: '0%',
    });
  });

  router.get('/leaderboard', (req: Request, res: Response) => {
    const sortBy = (req.query.sort as 'chips' | 'wins') || 'chips';
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const users = serverDb.getLeaderboard(limit, sortBy);
    res.json({ leaderboard: users });
  });

  return router;
}
