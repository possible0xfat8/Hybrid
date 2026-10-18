import React, { useState, useEffect } from 'react';
import { EnrichedFriend, UserProfileRecord } from '@/types/uno';
import { AccountProfile } from '@/lib/uno/account';
import { UserAvatar } from './UserAvatar';
import {
  Users,
  UserPlus,
  X,
  Play,
  Send,
  Check,
  Trash2,
  Clock,
  Radio,
  Search,
  Sparkles,
  Flame,
  AlertCircle,
  Copy,
  Zap,
} from 'lucide-react';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountProfile | null;
  activeRoomCode?: string | null;
  onJoinRoom: (roomCode: string) => void;
  onInviteFriend?: (friendId: string, roomCode: string) => void;
  walletAddress?: string | null;
  onConnectWallet?: () => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  account,
  activeRoomCode,
  onJoinRoom,
  onInviteFriend,
  walletAddress,
  onConnectWallet,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'requests'>('list');
  const [friends, setFriends] = useState<EnrichedFriend[]>([]);
  const [requestsReceived, setRequestsReceived] = useState<UserProfileRecord[]>([]);
  const [requestsSent, setRequestsSent] = useState<UserProfileRecord[]>([]);
  const [suggestedPlayers, setSuggestedPlayers] = useState<UserProfileRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());

  const fetchFriendsData = () => {
    if (!account?.id) return;
    setIsLoading(true);
    fetch(`/api/friends/${account.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.friends) setFriends(data.friends);
        if (data?.requestsReceived) setRequestsReceived(data.requestsReceived);
        if (data?.requestsSent) setRequestsSent(data.requestsSent);
      })
      .catch((err) => console.warn('Could not fetch friends:', err))
      .finally(() => setIsLoading(false));

    fetch(`/api/players/discover?userId=${account.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.players) setSuggestedPlayers(data.players);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen && account?.id && walletAddress) {
      fetchFriendsData();
      setActionNotice(null);
    }
  }, [isOpen, account?.id, walletAddress]);

  if (!isOpen) return null;

  if (!account || !walletAddress) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-[#0C0F14] border border-white/[0.08] rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative text-center">
          <div className="flex justify-end mb-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-[#FF4600]">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Connect your Web3 wallet to manage friends, see who is online playing Crazy 8, and send direct table invites.
          </p>
          <button
            onClick={() => {
              if (onConnectWallet) onConnectWallet();
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-sm uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Connect Wallet</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSendRequest = (targetQuery: string) => {
    if (!targetQuery.trim()) return;
    fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: account.id,
        targetQuery: targetQuery.trim(),
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setActionNotice(`Friend request sent to ${res.friend?.name || targetQuery}!`);
          setSearchQuery('');
          fetchFriendsData();
        } else {
          setActionNotice(res.error || 'Failed to send friend request');
        }
      })
      .catch(() => setActionNotice('Network error sending request'));
  };

  const handleAcceptRequest = (requesterId: string) => {
    fetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: account.id,
        requesterId,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setActionNotice('Friend request accepted!');
          fetchFriendsData();
        }
      })
      .catch(() => {});
  };

  const handleDeclineRequest = (requesterId: string) => {
    fetch('/api/friends/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: account.id,
        requesterId,
      }),
    })
      .then(() => fetchFriendsData())
      .catch(() => {});
  };

  const handleRemoveFriend = (friendId: string) => {
    fetch('/api/friends/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: account.id,
        friendId,
      }),
    })
      .then(() => fetchFriendsData())
      .catch(() => {});
  };

  const handleInviteToRoom = (friendId: string) => {
    if (!activeRoomCode || !onInviteFriend) return;
    onInviteFriend(friendId, activeRoomCode);
    setInvitedFriends((prev) => new Set(prev).add(friendId));
    setActionNotice('Game invite sent!');
    setTimeout(() => {
      setInvitedFriends((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }, 5000);
  };

  const formatLastSeen = (timestamp: number) => {
    const diffMin = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0C0F14] border border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#FF4600] flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                <span>Friends & Social</span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300 text-[9px] sm:text-[10px] font-mono font-medium">
                  {friends.length} Friends
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Join friends directly or invite them to your lobby
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/[0.06] px-3 sm:px-5 pt-1.5 sm:pt-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2 sm:pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 shrink-0 cursor-pointer ${
              activeTab === 'list'
                ? 'border-[#FF4600] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`pb-2 sm:pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 shrink-0 cursor-pointer ${
              activeTab === 'add'
                ? 'border-[#FF4600] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Add Friend
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-2 sm:pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'requests'
                ? 'border-[#FF4600] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Requests</span>
            {requestsReceived.length > 0 && (
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#FF4600] text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
                {requestsReceived.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="mx-5 mt-4 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 text-xs font-bold flex items-center justify-between animate-fade-in">
            <span>{actionNotice}</span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 sm:space-y-4 custom-scrollbar flex-1">
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-2.5 sm:space-y-3">
              {friends.length === 0 ? (
                <div className="py-8 sm:py-12 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 text-xl sm:text-2xl">
                    👥
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-300">No Friends Yet</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-xs mx-auto mb-3 sm:mb-4">
                    Add your favorite card slingers by handle or player ID to jump straight into tables together!
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] text-white text-[11px] sm:text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Find Players
                  </button>
                </div>
              ) : (
                friends.map((friend) => {
                  const isPlaying = friend.presence === 'in_game' && !!friend.currentRoomCode;
                  const isOnline = friend.presence === 'online' || isPlaying;

                  return (
                    <div
                      key={friend.id}
                      className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2 sm:gap-3 hover:bg-white/[0.04] transition-colors"
                    >
                      {/* Avatar & Info */}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-lg sm:text-xl overflow-hidden">
                            <UserAvatar avatar={friend.avatar} name={friend.name} className="w-full h-full text-lg sm:text-xl rounded-xl" />
                          </div>
                          {/* Presence Dot */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-[#0C0F14] ${
                              isPlaying
                                ? 'bg-[#FF4600] animate-pulse'
                                : isOnline
                                ? 'bg-emerald-400'
                                : 'bg-slate-600'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                            <span className="truncate max-w-[90px] sm:max-w-none">{friend.name}</span>
                            {friend.stats.gamesWon > 0 && (
                              <span className="text-[9px] sm:text-[10px] font-mono text-slate-300 flex items-center gap-0.5 shrink-0">
                                🏆{friend.stats.gamesWon}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1">
                            {isPlaying ? (
                              <span className="text-white font-medium flex items-center gap-1 truncate">
                                <span className="hidden sm:inline">Playing in</span>
                                <span className="font-mono bg-white/[0.08] px-1 rounded text-[#FF4600]">
                                  {friend.currentRoomCode}
                                </span>
                              </span>
                            ) : isOnline ? (
                              <span className="text-emerald-400 font-medium">Online</span>
                            ) : (
                              <span className="truncate">Seen {formatLastSeen(friend.lastSeen)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {/* If friend is playing in a room, 1-Click Join Match! */}
                        {isPlaying && friend.currentRoomCode && (
                          <button
                            onClick={() => {
                              onJoinRoom(friend.currentRoomCode!);
                              onClose();
                            }}
                            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                            title="Join friend's active match!"
                          >
                            <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                            <span className="hidden sm:inline">Join</span>
                          </button>
                        )}

                        {/* If user is in an active room and friend is online/not in same room, Invite */}
                        {activeRoomCode && isOnline && !isPlaying && onInviteFriend && (
                          <button
                            onClick={() => handleInviteToRoom(friend.id)}
                            disabled={invitedFriends.has(friend.id)}
                            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                              invitedFriends.has(friend.id)
                                ? 'bg-white/[0.04] text-slate-500'
                                : 'bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white shadow-sm active:scale-95'
                            }`}
                          >
                            {invitedFriends.has(friend.id) ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Sent</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                <span>Invite</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Remove Friend */}
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Remove Friend"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: ADD FRIEND & DISCOVER */}
          {activeTab === 'add' && (
            <div className="space-y-4 sm:space-y-5">
              {/* Search / Add Box */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 sm:mb-2">
                  Add Friend by Handle or ID
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter Player Name or ID..."
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-hidden focus:border-[#FF4600]/60 text-xs font-semibold"
                    />
                  </div>
                  <button
                    onClick={() => handleSendRequest(searchQuery)}
                    disabled={!searchQuery.trim()}
                    className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm ${
                      searchQuery.trim()
                        ? 'bg-[#FF4600] hover:bg-[#FF5500] text-white cursor-pointer active:scale-95'
                        : 'bg-white/[0.04] text-slate-600 cursor-not-allowed border border-white/[0.06]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>

              {/* Suggested Players from Server */}
              <div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF4600]" />
                  <span>Discover Active Players</span>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  {suggestedPlayers.length === 0 ? (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-slate-500">
                      No other players on server right now. Share your Friend ID!
                    </div>
                  ) : (
                    suggestedPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2 sm:gap-3"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-base sm:text-lg shrink-0 overflow-hidden">
                            <UserAvatar avatar={player.avatar} name={player.name} className="w-full h-full text-base sm:text-lg rounded-lg" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-none">
                              {player.name}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate max-w-[120px] sm:max-w-none">
                              {player.id}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSendRequest(player.id)}
                          className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] text-[10px] sm:text-xs font-medium flex items-center gap-1 transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4 sm:space-y-5">
              {/* Received Requests */}
              <div>
                <h3 className="text-[11px] sm:text-xs font-black text-slate-300 uppercase tracking-wider mb-2 sm:mb-2.5 flex items-center gap-1.5">
                  <span>Incoming Requests</span>
                  {requestsReceived.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-white text-[10px] font-mono font-medium">
                      {requestsReceived.length}
                    </span>
                  )}
                </h3>

                {requestsReceived.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 italic">
                    No pending incoming requests.
                  </p>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {requestsReceived.map((req) => (
                      <div
                        key={req.id}
                        className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2 sm:gap-3"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-base sm:text-lg shrink-0 overflow-hidden">
                            <UserAvatar avatar={req.avatar} name={req.name} className="w-full h-full text-base sm:text-lg rounded-lg" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-none">
                              {req.name}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400">
                              Wants to be friends
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[10px] sm:text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-[10px] sm:text-xs font-medium transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h3 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-2.5">
                  Sent Requests ({requestsSent.length})
                </h3>

                {requestsSent.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 italic">
                    No outgoing friend requests pending.
                  </p>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {requestsSent.map((req) => (
                      <div
                        key={req.id}
                        className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-2 sm:gap-3"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-base sm:text-lg shrink-0 overflow-hidden">
                            <UserAvatar avatar={req.avatar} name={req.name} className="w-full h-full text-base sm:text-lg rounded-lg" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-300 truncate max-w-[140px] sm:max-w-none">
                              {req.name}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-500">
                              Pending response...
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 text-[9px] sm:text-[10px] font-medium shrink-0">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
