import { Mic, Square, Sparkles, Volume2 } from 'lucide-react';

export default function Orb({
  listening = false,
  speaking = false,
  thinking = false,
  variant = 'hero', // 'hero' | 'compact'
  onClick,
}) {
  const stateClass = listening
    ? 'state-listening'
    : speaking
    ? 'state-speaking'
    : thinking
    ? 'state-thinking'
    : 'state-idle';

  if (variant === 'compact') {
    return (
      <button
        type="button"
        className={`orb-compact ${stateClass}`}
        onClick={onClick}
        title={listening ? 'Stop listening' : speaking ? 'Stop speaking' : 'Talk to Nova'}
        aria-label={listening ? 'Stop listening' : 'Start listening'}
      >
        <div className="orb-compact-glow" />
        <div className="orb-compact-core">
          {listening ? (
            <Square size={13} className="text-white fill-current" />
          ) : speaking ? (
            <Volume2 size={13} className="text-white animate-pulse" />
          ) : thinking ? (
            <Sparkles size={13} className="text-white spin-slow" />
          ) : (
            <Mic size={13} className="text-white" />
          )}
        </div>
      </button>
    );
  }

  return (
    <div className={`orb-wrapper ${stateClass}`}>
      {/* Outer acoustic shockwave ripples */}
      <div className="orb-ripple ripple-1" />
      <div className="orb-ripple ripple-2" />
      <div className="orb-ripple ripple-3" />

      {/* Cyber ambient glow backdrop */}
      <div className="orb-aura" />

      {/* Main 3D Sphere button */}
      <button
        type="button"
        className="orb-sphere"
        onClick={onClick}
        aria-label={listening ? 'Stop listening' : 'Start listening'}
      >
        <div className="orb-glare" />
        <div className="orb-inner-content">
          {listening ? (
            <Square size={30} className="orb-icon" />
          ) : speaking ? (
            <Volume2 size={32} className="orb-icon" />
          ) : thinking ? (
            <Sparkles size={32} className="orb-icon spin-slow" />
          ) : (
            <Mic size={34} className="orb-icon" />
          )}
        </div>
      </button>

      {/* Dynamic Soundwave equalizer bars */}
      {(listening || speaking) && (
        <div className="orb-soundwave" aria-hidden="true">
          <span className="wave-bar bar-1" />
          <span className="wave-bar bar-2" />
          <span className="wave-bar bar-3" />
          <span className="wave-bar bar-4" />
          <span className="wave-bar bar-5" />
          <span className="wave-bar bar-6" />
          <span className="wave-bar bar-7" />
        </div>
      )}
    </div>
  );
}
