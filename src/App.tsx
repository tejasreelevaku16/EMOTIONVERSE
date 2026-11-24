export default function App() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-void text-white p-6 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-glow/10 blur-[140px] pointer-events-none -top-40 -left-40" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-emerald-glow/10 blur-[140px] pointer-events-none -bottom-40 -right-40" />

      <header className="z-10 text-center max-w-2xl">
        <h1 className="font-cinzel text-4xl sm:text-6xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-200 to-emerald-400 mb-4 drop-shadow-[0_0_25px_rgba(103,232,249,0.3)]">
          EMOTIONVERSE
        </h1>
        <p className="font-cinzel text-sm sm:text-lg tracking-widest text-cyan-200/80 uppercase mb-8">
          The Last Light
        </p>
        <p className="text-gray-400 text-sm sm:text-base italic mb-10 leading-relaxed font-light">
          "Feel the World. Shape the Story. Change Your Destiny."
        </p>

        <div className="glass-panel p-6 rounded-2xl border border-cyan-glow/20">
          <p className="text-xs uppercase tracking-widest text-emerald-glow mb-2 font-mono">
            Phase 0 Initialized
          </p>
          <p className="text-sm text-gray-300">
            Bootstrap complete. Story engine, state persistence, and 3D world components ready for sequential mounting.
          </p>
        </div>
      </header>
    </div>
  );
}
