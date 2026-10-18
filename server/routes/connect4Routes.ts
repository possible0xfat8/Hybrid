import { Router } from 'express';
import { getConnect4PlayerStats, getRecentConnect4Matches } from '../services/connect4Settlement';

const router = Router();

// Get player stats on Hemi Sepolia
router.get('/stats/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const stats = await getConnect4PlayerStats(address);
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent on-chain settled matches
router.get('/matches/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const matches = await getRecentConnect4Matches(limit);
    res.json({ success: true, matches });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
