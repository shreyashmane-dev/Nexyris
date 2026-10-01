import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface RobotGreeting3DProps {
  userName?: string;
  onNavigateToChat: () => void;
  onNavigateToDocs: () => void;
}

export const RobotGreeting3D: React.FC<RobotGreeting3DProps> = ({
  userName = 'Explorer',
  onNavigateToChat,
  onNavigateToDocs,
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [speechText, setSpeechText] = useState(
    `Hello ${userName}! I'm Nexyris — your 100% offline, self-contained AI assistant running directly from your USB drive. How can I help you today?`
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      setMousePos({
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-1, Math.min(1, dy)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const triggerWave = () => {
    setIsWaving(true);
    const messages = [
      `Greetings ${userName}! Ready to run local inference at peak speed!`,
      "Zero telemetry. 100% air-gapped private intelligence on your USB pendrive.",
      "World Connect Plugins are active: DuckDuckGo, Wikipedia, Weather, GitHub!",
      "Need code or a shell? Jump into the Workspace or Terminal tab!",
      "Your AI. Your Models. Your Drive. Your Data."
    ];
    setSpeechText(messages[Math.floor(Math.random() * messages.length)]);
    setTimeout(() => setIsWaving(false), 2000);
  };

  // Calculated 3D angles
  const headRotateY = mousePos.x * 22;
  const headRotateX = -mousePos.y * 18;
  const eyeShiftX = mousePos.x * 12;
  const eyeShiftY = mousePos.y * 8;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-3xl p-6 md:p-8 overflow-hidden bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container-lowest border border-surface-container-highest shadow-lg flex flex-col lg:flex-row items-center justify-between gap-8 transition-all"
      style={{
        boxShadow: '0 20px 40px -15px rgba(184, 0, 53, 0.08), 0 0 0 1px rgba(226, 226, 227, 0.8)',
      }}
    >
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute -bottom-10 left-10 w-72 h-72 bg-tertiary/5 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Left Column: Greeting Message & Speech Bubble & Quick Action CTA */}
      <div className="flex-1 flex flex-col gap-4 z-10 max-w-xl">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-label-telemetry text-xs font-semibold self-start shadow-xs">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>NEURAL CO-PILOT ONLINE · PORTABLE USB MODE</span>
        </div>

        {/* Dynamic Title */}
        <h1 className="font-headline-xl text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight leading-tight m-0">
          Welcome to <span className="text-primary bg-clip-text">Nexyris Local Studio</span>
        </h1>

        {/* Robot Speech Bubble */}
        <div className="relative bg-surface-container-lowest p-4 md:p-5 rounded-2xl border border-surface-container-highest shadow-md text-on-surface font-body-lg text-sm md:text-base leading-relaxed flex flex-col gap-2">
          {/* Speech bubble tail */}
          <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-surface-container-highest" />
          <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-7 border-t-transparent border-b-7 border-b-transparent border-l-7 border-l-surface-container-lowest" />

          <div className="flex items-center justify-between text-xs text-secondary font-label-telemetry border-b border-surface-container-highest/60 pb-2">
            <span className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles size={14} /> Nexyris Assistant
            </span>
            <span>Click robot to interact</span>
          </div>

          <p className="m-0 text-on-surface font-medium leading-relaxed">
            {speechText}
          </p>

          <div className="flex items-center gap-2 pt-1 text-xs text-secondary font-label-telemetry">
            <ShieldCheck size={14} className="text-tertiary" />
            <span>Zero cloud leak · Models & chat live only on your flash drive</span>
          </div>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-3 flex-wrap pt-2">
          <button
            onClick={onNavigateToChat}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-body-sm text-sm font-semibold hover:bg-primary-container transition-all shadow-sm cursor-pointer border-none"
            type="button"
          >
            <MessageSquare size={16} />
            <span>Start Chat Session</span>
            <ArrowRight size={14} />
          </button>

          <button
            onClick={onNavigateToDocs}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-sm font-medium transition-colors border border-surface-container-highest cursor-pointer"
            type="button"
          >
            <Zap size={15} className="text-primary" />
            <span>Quick Start Guide</span>
          </button>
        </div>
      </div>

      {/* Right Column: 3D Animated Interactive Robot */}
      <div
        className="relative flex items-center justify-center p-4 cursor-pointer select-none group"
        onClick={triggerWave}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ perspective: 1000 }}
      >
        {/* Hovering Shadow */}
        <div
          className="absolute -bottom-2 w-48 h-7 bg-black/15 rounded-full blur-md transition-all duration-300 pointer-events-none"
          style={{
            transform: `scale(${isHovered ? 1.15 : 1})`,
            opacity: isHovered ? 0.35 : 0.2,
          }}
        />

        {/* 3D Floating Robot Canvas */}
        <div
          className="relative transition-transform duration-300 ease-out"
          style={{
            transform: `translateY(${isHovered ? -8 : 0}px) rotateY(${headRotateY}deg) rotateX(${headRotateX}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* High-tech Futuristic Robot SVG */}
          <svg
            width="240"
            height="260"
            viewBox="0 0 240 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-2xl transition-all duration-500"
          >
            <defs>
              {/* Metallic Gradients */}
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2c2d33" />
                <stop offset="50%" stopColor="#1e1f24" />
                <stop offset="100%" stopColor="#141418" />
              </linearGradient>

              <linearGradient id="armorLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4a4b52" />
                <stop offset="100%" stopColor="#2c2d33" />
              </linearGradient>

              {/* Visor Cyan/Crimson Gradient */}
              <linearGradient id="visorGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0c0c0e" />
                <stop offset="100%" stopColor="#18181f" />
              </linearGradient>

              {/* Eye Glow */}
              <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff4d6d" />
                <stop offset="60%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#991b1b" />
              </radialGradient>

              {/* Core Reactor */}
              <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#ff4d6d" />
                <stop offset="70%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#4c0519" />
              </radialGradient>

              {/* Drop Shadow Filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Floating Energy Rings around Base */}
            <ellipse
              cx="120"
              cy="235"
              rx="65"
              ry="16"
              fill="none"
              stroke="#dc2626"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.6"
              className="animate-spin"
              style={{ animationDuration: '8s' }}
            />
            <ellipse
              cx="120"
              cy="235"
              rx="45"
              ry="10"
              fill="none"
              stroke="#74d8bd"
              strokeWidth="1.2"
              opacity="0.5"
            />

            {/* Left Arm (Resting or Waving) */}
            <g
              style={{
                transformOrigin: '55px 145px',
                transform: isWaving
                  ? 'rotate(-55deg)'
                  : `rotate(${Math.sin(mousePos.x * 2) * 6}deg)`,
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {/* Shoulder Joint */}
              <circle cx="55" cy="145" r="10" fill="url(#armorLight)" stroke="#555" strokeWidth="1" />
              {/* Upper Arm */}
              <rect x="42" y="145" width="14" height="42" rx="7" fill="url(#bodyGrad)" stroke="#3a3a42" strokeWidth="1" />
              {/* Elbow Joint */}
              <circle cx="49" cy="190" r="7" fill="#dc2626" />
              {/* Forearm Hand */}
              <rect x="43" y="192" width="12" height="24" rx="6" fill="url(#armorLight)" />
            </g>

            {/* Right Arm (Waving Arm when clicked) */}
            <g
              style={{
                transformOrigin: '185px 145px',
                transform: isWaving
                  ? 'rotate(-120deg)'
                  : isHovered
                  ? 'rotate(-40deg)'
                  : `rotate(${-Math.sin(mousePos.x * 2) * 6}deg)`,
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {/* Shoulder Joint */}
              <circle cx="185" cy="145" r="10" fill="url(#armorLight)" stroke="#555" strokeWidth="1" />
              {/* Upper Arm */}
              <rect x="184" y="145" width="14" height="42" rx="7" fill="url(#bodyGrad)" stroke="#3a3a42" strokeWidth="1" />
              {/* Elbow Joint */}
              <circle cx="191" cy="190" r="7" fill="#dc2626" />
              {/* Forearm & Friendly Waving Hand */}
              <rect x="185" y="192" width="12" height="24" rx="6" fill="url(#armorLight)" />
              {isWaving && (
                <circle cx="191" cy="220" r="8" fill="#dc2626" filter="url(#glow)" opacity="0.8" />
              )}
            </g>

            {/* Torso / Robot Body */}
            <g id="torso">
              {/* Main Chest Plate */}
              <path
                d="M 75 130 Q 120 120 165 130 L 158 215 Q 120 225 82 215 Z"
                fill="url(#bodyGrad)"
                stroke="#3f4048"
                strokeWidth="1.5"
              />
              {/* Armor Highlights */}
              <path
                d="M 85 138 Q 120 130 155 138 L 150 170 Q 120 175 90 170 Z"
                fill="url(#armorLight)"
                opacity="0.9"
              />
              {/* Core Glowing Reactor (Beats like a heart) */}
              <circle
                cx="120"
                cy="172"
                r="14"
                fill="url(#coreGlow)"
                filter="url(#glow)"
                className="animate-pulse"
                style={{ animationDuration: '2s' }}
              />
              <circle cx="120" cy="172" r="6" fill="#ffffff" />
              {/* Chest Carbon Accents */}
              <line x1="102" y1="195" x2="138" y2="195" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
              <line x1="106" y1="202" x2="134" y2="202" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Neck Hydraulic Joint */}
            <rect x="110" y="112" width="20" height="15" rx="3" fill="#25262c" stroke="#444" strokeWidth="1" />

            {/* Head Assembly */}
            <g
              id="head"
              style={{
                transformOrigin: '120px 75px',
                transform: `translate(${eyeShiftX * 0.4}px, ${eyeShiftY * 0.4}px)`,
              }}
            >
              {/* Cyber Antenna with Pulsing Tip */}
              <line x1="120" y1="36" x2="120" y2="18" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
              <circle
                cx="120"
                cy="14"
                r="5"
                fill="#dc2626"
                filter="url(#glow)"
                className="animate-ping"
                style={{ animationDuration: '2.5s' }}
              />
              <circle cx="120" cy="14" r="3.5" fill="#ffffff" />

              {/* Side Ears / Headphone Audio Sensors */}
              <rect x="52" y="55" width="12" height="35" rx="6" fill="#dc2626" stroke="#444" strokeWidth="1" />
              <rect x="176" y="55" width="12" height="35" rx="6" fill="#dc2626" stroke="#444" strokeWidth="1" />

              {/* Head Shell Outer Helmet */}
              <rect
                x="60"
                y="34"
                width="120"
                height="80"
                rx="28"
                fill="url(#bodyGrad)"
                stroke="#3a3b42"
                strokeWidth="2"
              />

              {/* High-Gloss Curved Glass Visor */}
              <rect
                x="70"
                y="46"
                width="100"
                height="56"
                rx="20"
                fill="url(#visorGrad)"
                stroke="#2a2a32"
                strokeWidth="1.5"
              />

              {/* Visor Glare Reflection */}
              <path
                d="M 80 52 Q 120 48 152 56 Q 120 54 84 62 Z"
                fill="#ffffff"
                opacity="0.18"
              />

              {/* Eyes Tracking Cursor */}
              <g
                style={{
                  transform: `translate(${eyeShiftX}px, ${eyeShiftY}px)`,
                  transition: 'transform 0.1s ease-out',
                }}
              >
                {/* Left Eye */}
                <ellipse
                  cx="96"
                  cy="72"
                  rx={isHovered ? 12 : 10}
                  ry={isHovered ? 12 : 9}
                  fill="url(#eyeGlow)"
                  filter="url(#glow)"
                />
                <circle cx="96" cy="72" r="3.5" fill="#ffffff" />

                {/* Right Eye */}
                <ellipse
                  cx="144"
                  cy="72"
                  rx={isHovered ? 12 : 10}
                  ry={isHovered ? 12 : 9}
                  fill="url(#eyeGlow)"
                  filter="url(#glow)"
                />
                <circle cx="144" cy="72" r="3.5" fill="#ffffff" />

                {/* Digital Cheek LED Indicators */}
                <circle cx="82" cy="85" r="1.5" fill="#74d8bd" opacity="0.8" />
                <circle cx="87" cy="85" r="1.5" fill="#74d8bd" opacity="0.8" />
                <circle cx="153" cy="85" r="1.5" fill="#74d8bd" opacity="0.8" />
                <circle cx="158" cy="85" r="1.5" fill="#74d8bd" opacity="0.8" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
