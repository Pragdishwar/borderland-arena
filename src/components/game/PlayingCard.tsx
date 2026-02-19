import { motion } from "framer-motion";

type PlayingCardProps = {
  suit: { key: string; symbol: string; name: string; color: string };
  isUsed: boolean;
  isRound4?: boolean;
  onClick: () => void;
  index: number;
};

const FACE_CARDS: Record<string, { label: string; symbol: string }> = {
  spades: { label: "K", symbol: "♠" },
  hearts: { label: "Q", symbol: "♥" },
  diamonds: { label: "J", symbol: "♦" },
  clubs: { label: "A", symbol: "♣" },
};

const PlayingCard = ({ suit, isUsed, isRound4 = false, onClick, index }: PlayingCardProps) => {
  const face = FACE_CARDS[suit.key];

  // Random float duration and delay for "Zero-G" feel
  const floatDuration = 4 + Math.random() * 2;
  const floatDelay = index * 0.5;

  if (isUsed) {
    return (
      <div className="relative rounded-xl p-6 text-center opacity-30 cursor-not-allowed border border-border bg-card/30">
        <div className={`text-5xl md:text-6xl mb-2 ${suit.color}`}>{isRound4 ? face.label : suit.symbol}</div>
        <p className="font-display text-xs tracking-wider text-muted-foreground">{suit.name}</p>
        <p className="font-display text-xs text-destructive mt-1">USED</p>
      </div>
    );
  }

  return (
    <motion.div
      animate={{
        y: [0, -15, 0],
        rotate: [0, 1, -1, 0],
      }}
      transition={{
        y: {
          duration: floatDuration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatDelay
        },
        rotate: {
          duration: floatDuration * 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatDelay
        }
      }}
      whileHover={{
        scale: 1.1,
        boxShadow: "0 0 40px hsl(var(--primary) / 0.5)",
        zIndex: 10
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl p-6 text-center group border border-primary/20
        ${isRound4
          ? "bg-gradient-to-br from-card to-secondary/40 hover:border-primary/70"
          : "bg-black/40 backdrop-blur-md hover:bg-black/60"
        }
      `}
    >
      {/* Glow effect container */}
      <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <motion.div
        className={`relative z-10 text-6xl md:text-7xl mb-3 ${suit.color} drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]`}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {isRound4 ? face.label : suit.symbol}
      </motion.div>

      {isRound4 && (
        <div className={`text-3xl mb-2 ${suit.color}`}>{face.symbol}</div>
      )}

      <p className="relative z-10 font-display text-sm tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
        {suit.name}
      </p>
    </motion.div>
  );
};

export default PlayingCard;
