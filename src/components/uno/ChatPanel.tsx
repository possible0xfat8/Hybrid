import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Send, MessageSquare, X, Sparkles, Shield, Eye, Lock } from 'lucide-react';

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  myPlayerId: string;
  isSpectator?: boolean;
  unreadCount: number;
  roomCode?: string;
  roomId?: string;
}

const QUICK_CHATS = [
  'Good luck! 🍀',
  'Watch out! 🔥',
  'CRAZY 8! ⚡',
  'Nice counter! 🛡️',
  'Please no +4! 😭',
  'GG! 🏆',
  'Speed up! ⏱️',
  'Great move! 👏',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onToggle,
  messages,
  onSendMessage,
  myPlayerId,
  isSpectator = false,
  unreadCount,
  roomCode,
  roomId,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to latest message when panel is open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(text);
    setInputText('');
  };

  const handleQuickChat = (text: string) => {
    onSendMessage(text);
  };

  return (
    <>
      {/* Floating Toggle Button (Positioned above bottom action bar on mobile, corner on desktop) */}
      <button
        id="chat-toggle-button"
        onClick={onToggle}
        className={`
          fixed bottom-18 right-3 sm:bottom-5 sm:right-5 z-40 p-2.5 sm:p-3.5 rounded-2xl flex items-center gap-2 shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer
          ${isOpen
            ? 'bg-[#FF4600] text-white shadow-[#FF4600]/20'
            : 'bg-[#0C0F14]/95 hover:bg-[#141820] text-white border border-white/[0.08] shadow-black/80 backdrop-blur-md'}
        `}
        title="Open Live Chat"
      >
        <div className="relative">
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-2.5 -right-2.5 px-1.5 py-0.5 min-w-4 h-4 sm:min-w-5 sm:h-5 rounded-full bg-[#FF4600] text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs font-bold tracking-wide hidden sm:inline">
          {isOpen ? 'Close Chat' : 'Live Chat'}
        </span>
        {isSpectator && !isOpen && (
          <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300 text-[10px] font-bold border border-white/[0.08]">
            Spec
          </span>
        )}
      </button>

      {/* Slide-in Chat Drawer */}
      {isOpen && (
        <div
          id="chat-panel-container"
          className="fixed bottom-32 right-2 sm:bottom-20 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-96 max-h-[500px] h-[65vh] sm:h-[75vh] flex flex-col bg-[#0C0F14]/95 border border-white/[0.08] rounded-3xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#08090C]/80 rounded-t-3xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#FF4600]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Lobby Chat</span>
                  {roomCode && (
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-200 border border-white/[0.08] text-[10px] font-mono font-bold tracking-wider">
                      {roomCode}
                    </span>
                  )}
                  {isSpectator && (
                    <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/[0.08] text-[9px] font-bold flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" /> Spec
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                  <Lock className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Private to Lobby {roomCode || ''} & players</span>
                </p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Chat Chips */}
          <div className="px-3 py-2 border-b border-white/[0.06] bg-[#08090C]/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_CHATS.map((qc) => (
              <button
                key={qc}
                onClick={() => handleQuickChat(qc)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[11px] font-medium whitespace-nowrap transition-colors active:scale-95 shrink-0 border border-white/[0.06] cursor-pointer"
              >
                {qc}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#FF4600] mb-2 shadow-inner">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs font-bold text-slate-300">Private Lobby Chat</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[230px]">
                  Messages sent here are strictly private to players and spectators in this lobby.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === myPlayerId;
                const isSystem = msg.isSystem;

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex items-center justify-center my-1.5">
                      <div className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-300 text-[11px] font-medium flex items-center gap-1.5 shadow-sm text-center">
                        <span>{msg.senderAvatar}</span>
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-medium">
                      <span className="text-xs">{msg.senderAvatar}</span>
                      <span className={`font-bold ${isMe ? 'text-[#FF4600]' : 'text-slate-300'}`}>
                        {msg.senderName}
                      </span>
                      {msg.isSpectator && (
                        <span className="px-1 py-0.2 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08] text-[9px] font-bold">
                          👁️ Spec
                        </span>
                      )}
                      <span className="text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`
                        px-3.5 py-2 rounded-2xl max-w-[85%] break-words leading-relaxed shadow-sm
                        ${isMe
                          ? 'bg-[#FF4600] text-white rounded-tr-xs font-medium'
                          : 'bg-white/[0.04] text-slate-100 rounded-tl-xs border border-white/[0.06]'}
                      `}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 border-t border-white/[0.06] bg-[#08090C]/80 rounded-b-3xl">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={140}
                placeholder={isSpectator ? 'Chat as spectator...' : 'Send message to table...'}
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-white placeholder:text-slate-500 text-xs focus:outline-hidden focus:border-[#FF4600] transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`
                  absolute right-1.5 p-1.5 rounded-lg transition-all
                  ${inputText.trim()
                    ? 'bg-[#FF4600] text-white hover:bg-[#FF5500] cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'}
                `}
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between px-1 mt-1.5 text-[10px] text-slate-500">
              <span>Enter to send</span>
              <span>{inputText.length}/140</span>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
