import { useState, useEffect } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { hasSavedGame } from '../services/persistence';
import { Sparkles, Play, Compass, Volume2, VolumeX, Eye, AlertTriangle } from 'lucide-react';
import { audioService } from '../services/audio';

export function Landing() {
  const { goToScreen, continueJourney, settings, toggleMute, toggleReducedMotion } = useGameStore();
  const [canContinue, setCanContinue] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  useEffect(() => {
    setCanContinue(hasSavedGame());
  }, []);

  const handleStartNew = () => {
    if (canContinue) {
      setShowOverwriteConfirm(true);
    } else {
      goToScreen('emotion_selection');
    }
  };

  const confirmStartNew = () => {
    setShowOverwriteConfirm(false);
    goToScreen('emotion_selection');
  };

  const handleContinue = () => {
    const success = continueJourney();
    if (!success) {
      setCanContinue(false);
    } else {
      audioService.playMood('curiosity');
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-between p-6 sm:p-12 overflow-hidden bg-void select-none">
      {/* Background magical ambient gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-glow/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] rounded-full bg-emerald-deep/60 blur-[130px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-[400px] h-[400px] rounded-full bg-hope-glow/5 blur-[120px] pointer-events-none" />

      {/* Top Bar with quick accessibility toggles */}
      <header className="w-full max-w-6xl flex justify-between items-center z-10">
        <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-emerald-glow/80 font-mono">
          <Sparkles className="w-4 h-4 text-emerald-glow animate-pulse" />
          <span>Interactive 3D Living Story</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              toggleMute();
              audioService.setMuted(!settings.muted);
            }}
            className="glass-button p-2.5 rounded-full text-gray-300 hover:text-white"
            title={settings.muted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label="Toggle audio"
          >
            {settings.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-glow" />}
          </button>
          <button
            onClick={toggleReducedMotion}
            className={`glass-button p-2.5 rounded-full ${settings.reducedMotion ? 'text-amber-400 border-amber-400/50' : 'text-gray-300 hover:text-white'}`}
            title="Toggle Reduced Motion"
            aria-label="Toggle reduced motion"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Center Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center z-10 max-w-3xl my-auto">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full glass-panel-subtle mb-6 border border-cyan-glow/20">
          <span className="w-2 h-2 rounded-full bg-cyan-glow animate-ping" />
          <span className="text-xs uppercase tracking-widest text-cyan-200 font-cinzel">
            The Last Light
          </span>
        </div>

        <h1 className="font-cinzel text-5xl sm:text-7xl lg:text-8xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-emerald-400 drop-shadow-[0_0_35px_rgba(103,232,249,0.35)] mb-6">
          EMOTIONVERSE
        </h1>

        <p className="font-cinzel text-base sm:text-2xl text-cyan-100/90 tracking-widest italic mb-4 max-w-2xl font-light">
          "Feel the World. Shape the Story. Change Your Destiny."
        </p>

        <p className="text-gray-400 text-sm sm:text-base max-w-xl mb-12 font-light leading-relaxed">
          The ancient realm is losing its primordial light. As the final keeper, your dominant emotion transforms the environment, while three forgotten artifacts determine whether reality is restored, reborn, or extinguished.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 w-full max-w-md">
          {canContinue && (
            <button
              onClick={handleContinue}
              className="w-full sm:w-1/2 py-4 px-6 rounded-xl glass-panel border border-cyan-glow/50 hover:border-cyan-glow shadow-glow-cyan text-white font-cinzel font-semibold tracking-wider flex items-center justify-center space-x-3 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
            >
              <Compass className="w-5 h-5 text-cyan-glow group-hover:rotate-45 transition-transform" />
              <span>Continue</span>
            </button>
          )}

          <button
            onClick={handleStartNew}
            className={`${canContinue ? 'w-full sm:w-1/2' : 'w-full'} py-4 px-8 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-cinzel font-bold tracking-widest shadow-glow-emerald flex items-center justify-center space-x-3 transition-all hover:scale-105 active:scale-95 cursor-pointer`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>New Journey</span>
          </button>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full text-center text-xs text-gray-500 font-mono tracking-wider z-10">
        Deterministic Narrative Engine • React Three Fiber 3D • Synthesized WebAudio
      </footer>

      {/* Overwrite Existing Progress Confirmation Modal */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="glass-panel p-8 rounded-2xl max-w-md w-full border border-red-500/40 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="font-cinzel text-xl font-bold text-white mb-2">Begin New Journey?</h2>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              You have an active journey saved. Starting a new journey will clear your current story progress, variables, and decisions.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowOverwriteConfirm(false)}
                className="flex-1 py-3 rounded-lg glass-button text-gray-300 hover:text-white text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartNew}
                className="flex-1 py-3 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-semibold text-sm transition-colors shadow-lg"
              >
                Overwrite & Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
