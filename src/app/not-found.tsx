import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-14 h-14 rounded-2xl bg-[#FF4600]/15 border border-[#FF4600]/30 flex items-center justify-center mb-4 text-[#FF4600] font-black text-xl shadow-[0_0_20px_rgba(255,70,0,0.2)]">
        404
      </div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
        Page Not Found
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        The game room or page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-[#FF4600] hover:bg-[#e83a00] text-white font-bold text-sm transition-all shadow-[0_0_16px_rgba(255,70,0,0.3)]"
      >
        Return to Arcade
      </Link>
    </div>
  );
}
