import React, { useState, useEffect, useRef } from 'react';
import { AccountProfile, DEFAULT_AVATARS } from '@/lib/uno/account';
import { UserProfileRecord } from '@/types/uno';
import { WalletState, formatAddress } from '@/lib/uno/wallet';
import { UserAvatar, isAvatarUrl } from './UserAvatar';
import {
  User,
  X,
  Trophy,
  Flame,
  Zap,
  Coins,
  Copy,
  Check,
  Sparkles,
  Shield,
  Layers,
  Save,
  Wallet,
  Camera,
  Upload,
  Loader2,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountProfile | null;
  onSaveProfile: (updates: Partial<AccountProfile>) => void;
  wallet: WalletState;
  onConnectWallet?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  account,
  onSaveProfile,
  wallet,
  onConnectWallet,
}) => {
  const [name, setName] = useState(account?.name || '');
  const [avatar, setAvatar] = useState(account?.avatar || '🦊');
  const [bio, setBio] = useState(account?.bio || 'Crazy 8 card slinger & pot sweeper');
  const [copiedId, setCopiedId] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileRecord | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && account && wallet.address) {
      setName(account.name);
      setAvatar(account.avatar);
      setBio(account.bio || 'Crazy 8 card slinger & pot sweeper');
      setSavedSuccess(false);

      // Fetch user profile from database by connected wallet address
      setLoadingStats(true);
      const cleanAddr = wallet.address.trim().toLowerCase();
      const targetUrl = `/api/profile/by-address/${encodeURIComponent(cleanAddr)}`;

      fetch(targetUrl)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setProfileData(data);
            if (data.name) setName(data.name);
            if (data.avatar) setAvatar(data.avatar);
            if (data.bio) setBio(data.bio);
          }
        })
        .catch((err) => console.warn('Could not fetch server profile:', err))
        .finally(() => setLoadingStats(false));
    }
  }, [isOpen, account?.id, account?.name, account?.avatar, account?.bio, wallet.address]);

  if (!isOpen) return null;

  if (!account || !wallet.address) {
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
            <Wallet className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            All player profiles, custom identities, rank titles, and match histories are tied directly to your Web3 wallet address. Connect your wallet to view and customize your profile.
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

  const handleCopyId = () => {
    if (account.id) {
      navigator.clipboard.writeText(account.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);

    // Validate type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, GIF)');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Read file to data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });

      // Upload to server / Cloudflare R2
      const res = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet.address || account?.address,
          accountId: account?.id,
          image: dataUrl,
          contentType: file.type,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.avatarUrl) {
        throw new Error(data.error || 'Failed to upload photo to Cloudflare R2');
      }

      setAvatar(data.avatarUrl);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);

      // Instantly update profile in client state
      onSaveProfile({
        avatar: data.avatarUrl,
      });
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setUploadError(err.message || 'Error uploading image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Player';
    const cleanBio = bio.trim();

    onSaveProfile({
      name: cleanName,
      avatar,
      bio: cleanBio,
    });

    // Save to server database
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: account.id,
        name: cleanName,
        avatar,
        bio: cleanBio,
        address: wallet.address || account.address,
      }),
    })
      .then((res) => res.json())
      .then((updated) => {
        if (updated) setProfileData(updated);
      })
      .catch((err) => console.warn('Failed to save profile to database:', err));

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const rawStats = (profileData?.stats as any) || {};
  const stats = {
    gamesPlayed: rawStats.matchesPlayed ?? rawStats.gamesPlayed ?? 0,
    gamesWon: rawStats.wins ?? rawStats.gamesWon ?? 0,
    cardsPlayed: rawStats.cardsPlayed ?? 0,
    winStreak: rawStats.winStreak ?? 0,
    bestWinStreak: rawStats.bestWinStreak ?? 0,
    totalEarningsEth: rawStats.totalWinnings ?? rawStats.totalEarningsEth ?? '0.000',
  };

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0C0F14] border border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white flex items-center justify-center shrink-0 overflow-hidden">
              <UserAvatar avatar={avatar} name={name} className="w-full h-full text-base sm:text-lg rounded-xl" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                <span>Player Profile & Stats</span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300 text-[9px] sm:text-[10px] font-mono font-medium">
                  Database Synced
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Persistent across refreshes, devices, and rooms
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

        {/* Scrollable Content */}
        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            {/* Display Handle */}
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Lobby Display Handle
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={18}
                  placeholder="Your player handle"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-hidden focus:border-[#FF4600]/60 text-xs sm:text-sm font-semibold transition-colors"
                  required
                />
              </div>
            </div>

            {/* Avatar & Photo Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Player Avatar & Photo
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Cloudflare R2 Storage</span>
              </div>

              {/* Avatar Preview & Action Box */}
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="relative group shrink-0">
                    <UserAvatar
                      avatar={avatar}
                      name={name}
                      className="w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-3xl rounded-2xl bg-white/[0.04] border border-white/[0.1] shadow-md"
                      imgClassName="w-full h-full object-cover rounded-2xl"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      title="Upload custom photo"
                      className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-white/[0.15] hover:bg-white/[0.25] text-white border border-white/[0.2] shadow-sm transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                      <span>{isAvatarUrl(avatar) ? 'Custom Photo' : 'Preset Emoji'}</span>
                      {isAvatarUrl(avatar) && (
                        <span className="px-1.5 py-0.2 rounded-full bg-white/[0.06] border border-white/[0.1] text-slate-300 text-[9px] font-mono font-medium">
                          R2 Active
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[190px] sm:max-w-[240px]">
                      {isAvatarUrl(avatar)
                        ? 'Hosted on Cloudflare R2'
                        : 'Upload a picture or pick an emoji below'}
                    </p>
                    {uploadSuccess && (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" /> Uploaded to R2!
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        <span>Upload Photo</span>
                      </>
                    )}
                  </button>

                  {isAvatarUrl(avatar) && (
                    <button
                      type="button"
                      onClick={() => setAvatar('🦊')}
                      className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Reset to Emoji</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] leading-tight">{uploadError}</span>
                </div>
              )}

              {/* Preset Emoji Grid */}
              <div>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Or Choose Preset Emoji
                </span>
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        setAvatar(av);
                        setUploadError(null);
                      }}
                      className={`h-9 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl transition-all cursor-pointer ${
                        avatar === av
                          ? 'bg-white/[0.08] border-2 border-[#FF4600]/80 shadow-sm'
                          : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bio / Tagline */}
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Player Status / Bio
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={60}
                placeholder="e.g. Always holding a Wild +4 card"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-hidden focus:border-[#FF4600]/60 text-xs transition-colors"
              />
            </div>

            {/* Player ID & Friend Code */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Friend Code / ID
                </div>
                <div className="text-[11px] sm:text-xs font-mono font-bold text-white truncate max-w-[130px] sm:max-w-[260px]">
                  {account.id}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-200 text-[10px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Wallet Integration Status */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-white truncate">
                    Hemi Settlement Wallet
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                    {wallet.address ? formatAddress(wallet.address) : 'No Web3 wallet linked'}
                  </div>
                </div>
              </div>
              {wallet.address && (
                <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-slate-300 text-[9px] sm:text-[10px] font-medium shrink-0">
                  Connected
                </span>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={savedSuccess}
              className={`w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-[#FF4600] hover:bg-[#FF5500] text-white active:scale-98'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Profile Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </form>

          {/* Database Career Stats */}
          <div className="pt-2 border-t border-white/[0.06]">
            <h3 className="text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-[#FF4600]" />
              <span>Career Database Stats</span>
              {loadingStats && (
                <span className="text-[10px] text-slate-500 font-normal">Loading...</span>
              )}
            </h3>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* Wins */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-base sm:text-lg font-black text-white font-mono">
                  {stats.gamesWon}
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Victories
                </div>
              </div>

              {/* Matches */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-base sm:text-lg font-black text-white font-mono">
                  {stats.gamesPlayed}
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Matches
                </div>
              </div>

              {/* Win Rate */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-base sm:text-lg font-black text-white font-mono">
                  {winRate}%
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Win Rate
                </div>
              </div>

              {/* Current Streak */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-base sm:text-lg font-black text-white font-mono flex items-center justify-center gap-0.5 sm:gap-1">
                  <span>{stats.winStreak}</span>
                  {stats.winStreak > 1 && <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#FF4600] text-[#FF4600]" />}
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Win Streak
                </div>
              </div>

              {/* Best Streak */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-base sm:text-lg font-black text-white font-mono">
                  {stats.bestWinStreak}
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Best Streak
                </div>
              </div>

              {/* Cards Played */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-base sm:text-lg font-black text-white font-mono">
                  {stats.cardsPlayed}
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Cards Played
                </div>
              </div>
            </div>

            {/* Total Pot Earnings */}
            <div className="mt-2 p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF4600] shrink-0" />
                <span className="text-[11px] sm:text-xs font-semibold text-slate-300">
                  Career Pot Won
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white font-mono">
                {stats.totalEarningsEth} ETH
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
