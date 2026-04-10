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

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Background Aura */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.15, 1] : 1,
          opacity: isSpeaking ? [0.1, 0.3, 0.1] : 0.05,
        }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ backgroundColor: colors.primary }}
      />

      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        {/* Shoulders/Torso */}
        <path
          d="M40 190 Q100 140 160 190 L160 200 L40 200 Z"
          fill={colors.secondary}
          className="opacity-80"
        />
        
        {/* Neck */}
        <rect x="85" y="130" width="30" height="20" fill="#e5e7eb" />

        {/* Head Shape */}
        <motion.g
          animate={{
            y: isSpeaking ? [0, -2, 0] : 0,
          }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          <path
            d="M60 80 Q60 30 100 30 Q140 30 140 80 Q140 140 100 140 Q60 140 60 80"
            fill="white"
            stroke={colors.primary}
            strokeWidth="2"
          />

          {/* Eyes */}
          <g className="eyes">
            <motion.circle
              cx="80" cy="75" r="4"
              fill={colors.secondary}
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ repeat: Infinity, duration: 4, times: [0, 0.05, 0.1] }}
            />
            <motion.circle
              cx="120" cy="75" r="4"
              fill={colors.secondary}
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ repeat: Infinity, duration: 4, times: [0, 0.05, 0.1] }}
            />
          </g>

          {/* Mouth */}
          <motion.path
            d={isSpeaking 
              ? "M85 110 Q100 125 115 110" 
              : "M85 115 Q100 115 115 115"}
            stroke={colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            animate={isSpeaking ? {
              d: [
                "M85 110 Q100 125 115 110",
                "M85 115 Q100 105 115 115",
                "M85 110 Q100 125 115 110"
              ]
            } : {}}
            transition={{ repeat: Infinity, duration: 0.2 }}
          />

          {/* Listening Pulse (Cheeks) */}
          {isListening && (
            <g>
              <motion.circle
                cx="75" cy="95" r="3"
                fill={colors.primary}
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
              <motion.circle
                cx="125" cy="95" r="3"
                fill={colors.primary}
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ repeat: Infinity, duration: 1 }}
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
