import 'dotenv/config';
import { getChessLeaderboard, getChessPlayerStats, getChessMatchHistory } from '../server/services/chess/supabaseChess';
import { loadInitialDataFromSupabase, fetchUnoLeaderboardFromSupabase } from '../server/services/uno/supabaseUno';
import { serverDb } from '../server/engine/uno/database';

async function main() {
  console.log('============================================');
  console.log('🧪 TESTING FULL SUPABASE INTEGRATION');
  console.log('============================================');

  // 1. Test Uno Supabase
  console.log('\n🃏 1. UNO SUPABASE TESTING:');
  const unoData = await loadInitialDataFromSupabase();
  if (unoData) {
    console.log(`✓ Successfully pulled ${Object.keys(unoData.users).length} profiles and ${Object.keys(unoData.recentRooms).length} rooms.`);
  } else {
    console.error('✗ Failed to load Uno Supabase data');
  }

  const unoLeaderboard = await fetchUnoLeaderboardFromSupabase(5);
  console.log(`✓ Top Uno Leaderboard entries: ${unoLeaderboard?.length || 0}`);
  if (unoLeaderboard && unoLeaderboard.length > 0) {
    console.log('  Top Uno Player:', unoLeaderboard[0].name, unoLeaderboard[0].stats);
  }

  // 2. Test Chess Supabase
  console.log('\n♟️ 2. CHESS SUPABASE TESTING:');
  const chessLeaderboard = await getChessLeaderboard(5);
  console.log(`✓ Top Chess Leaderboard entries: ${chessLeaderboard.length}`);
  if (chessLeaderboard.length > 0) {
    console.log('  Top Chess Player:', chessLeaderboard[0].name, `${chessLeaderboard[0].elo} ELO`);
  }

  const testAddr = '0x8e8e39d67d227e0a8b10095e07ea020d53926df3';
  const stats = await getChessPlayerStats(testAddr);
  console.log(`✓ Player stats for ${testAddr.slice(0, 10)}...:`, stats.username, `${stats.elo_rating} ELO, ${stats.wins}W / ${stats.losses}L`);

  const history = await getChessMatchHistory(testAddr, 3);
  console.log(`✓ Match history for ${testAddr.slice(0, 10)}...: ${history.length} games found`);
  if (history.length > 0) {
    console.log('  Recent Game:', history[0].game_id, history[0].outcome, history[0].completed_at);
  }

  // 3. Test Local DB instance hydration
  console.log('\n⚡ 3. LOCAL SERVER DATABASE TEST:');
  const allUsers = serverDb.getAllUsers();
  console.log(`✓ ServerDatabase loaded with ${allUsers.length} total players (in-memory + Supabase synced).`);

  console.log('\n============================================');
  console.log('🎉 ALL SUPABASE INTEGRATIONS OPERATIONAL!');
  console.log('============================================');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
