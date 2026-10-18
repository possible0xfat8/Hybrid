'use client';

import React from 'react';
import { Navbar } from '@/components/chess/Navbar';
import { Footer } from '@/components/chess/Footer';
import { FriendsList } from '@/components/chess/FriendsList';

export default function ChessFriendsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-['Poppins',sans-serif]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full">
        <FriendsList />
      </main>

      <Footer />
    </div>
  );
}
