import { motion, AnimatePresence } from 'motion/react';

interface AvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  character?: 'professional' | 'tech' | 'creative';
}

export const Avatar = ({ isSpeaking, isListening, character = 'professional' }: AvatarProps) => {
  // Character color schemes
  const colors = {
    professional: { primary: '#2563eb', secondary: '#1e40af', skin: '#fcd34d' },
    tech: { primary: '#10b981', secondary: '#065f46', skin: '#fbbf24' },
    creative: { primary: '#f43f5e', secondary: '#9f1239', skin: '#f59e0b' },
  }[character];

  // Idle head movement (sway and subtle nod)
  const headAnimation = {
    y: isSpeaking 
      ? [0, -4, 0, -2, 0] 
      : isListening 
        ? [0, 1, 0] 
        : [0, -1, 0, 1, 0], // Subtle idle sway
    rotate: isSpeaking 
      ? [0, -1, 1, 0] 
      : isListening 
        ? [0, 0.5, -0.5, 0] 
        : [0, 0.5, 0, -0.5, 0],
  };

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Background Aura */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.2, 1] : isListening ? [1, 1.05, 1] : 1,
          opacity: isSpeaking ? [0.1, 0.4, 0.1] : isListening ? [0.05, 0.2, 0.05] : 0.05,
        }}
        transition={{ repeat: Infinity, duration: isSpeaking ? 1.5 : 3 }}
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ backgroundColor: colors.primary }}
      />

      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        {/* Shoulders/Torso */}
        <motion.path
          d="M40 190 Q100 140 160 190 L160 200 L40 200 Z"
          fill={colors.secondary}
          className="opacity-80"
          animate={{
            d: isSpeaking 
              ? "M38 192 Q100 138 162 192 L162 200 L38 200 Z" 
              : "M40 190 Q100 140 160 190 L160 200 L40 200 Z"
          }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        
        {/* Neck */}
        <rect x="85" y="130" width="30" height="20" fill="#e5e7eb" />

        {/* Head Shape */}
        <motion.g
          animate={headAnimation}
          transition={{ 
            repeat: Infinity, 
            duration: isSpeaking ? 0.4 : 4,
            ease: "easeInOut"
          }}
          style={{ originX: "100px", originY: "140px" }}
        >
          <path
            d="M60 80 Q60 30 100 30 Q140 30 140 80 Q140 140 100 140 Q60 140 60 80"
            fill="white"
            stroke={colors.primary}
            strokeWidth="2"
          />

          {/* Eyes */}
          <g className="eyes">
            {/* Left Eye */}
            <motion.g
              animate={{
                scaleY: [1, 1, 0.1, 1, 1], // Natural blink pattern
              }}
              transition={{
                repeat: Infinity,
                duration: 5,
                times: [0, 0.4, 0.42, 0.44, 1],
                ease: "easeInOut"
              }}
              style={{ originX: "80px", originY: "75px" }}
            >
              <circle cx="80" cy="75" r="4" fill={colors.secondary} />
            </motion.g>

            {/* Right Eye */}
            <motion.g
              animate={{
                scaleY: [1, 1, 0.1, 1, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 5,
                times: [0, 0.4, 0.42, 0.44, 1],
                ease: "easeInOut"
              }}
              style={{ originX: "120px", originY: "75px" }}
            >
              <circle cx="120" cy="75" r="4" fill={colors.secondary} />
            </motion.g>
          </g>

          {/* Mouth */}
          <motion.path
            stroke={colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            animate={isSpeaking ? {
              d: [
                "M85 115 Q100 115 115 115", // Closed
                "M85 110 Q100 125 115 110", // Open wide
                "M90 112 Q100 118 110 112", // Small talk
                "M85 115 Q100 120 115 115", // Mid open
                "M85 115 Q100 115 115 115"  // Closed
              ],
            } : isListening ? {
              d: "M90 115 Q100 118 110 115" // Slight smile/attentive
            } : {
              d: "M85 115 Q100 115 115 115" // Neutral
            }}
            transition={{ 
              repeat: isSpeaking ? Infinity : 0, 
              duration: 0.15,
              ease: "linear"
            }}
          />

          {/* Listening Pulse (Cheeks) */}
          {isListening && (
            <g>
              <motion.circle
                cx="75" cy="95" r="3"
                fill={colors.primary}
                animate={{ 
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.2, 1]
                }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
              <motion.circle
                cx="125" cy="95" r="3"
                fill={colors.primary}
                animate={{ 
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.2, 1]
                }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            </g>
          )}
        </motion.g>
      </svg>

      {/* Status Badge */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className="absolute -bottom-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg tracking-widest uppercase"
          >
            Listening
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
