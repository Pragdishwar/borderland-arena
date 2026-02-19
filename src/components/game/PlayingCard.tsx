import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type PlayingCardProps = {
  suit: { key: string; symbol: string; name: string; color: string };
  isUsed: boolean;
  isRound4?: boolean;
  onClick: () => void;
};

const FACE_CARDS: Record<string, { label: string; symbol: string }> = {
  spades: { label: "K", symbol: "♠" },
  hearts: { label: "Q", symbol: "♥" },
  diamonds: { label: "J", symbol: "♦" },
  clubs: { label: "A", symbol: "♣" },
};

const PlayingCard = ({ suit, isUsed, isRound4 = false, onClick }: PlayingCardProps) => {
  const face = FACE_CARDS[suit.key];

  if (isUsed) {
    return (
      <div className="relative rounded-xl p-6 text-center opacity-30 cursor-not-allowed border border-border bg-card/30">
        <div className={`text-5xl md:text-6xl mb-2 ${suit.color}`}>{isRound4 ? face.label : suit.symbol}</div>
        <p className="font-display text-xs tracking-wider text-muted-foreground">{suit.name}</p>
        <p className="font-display text-xs text-destructive mt-1">USED</p>
      </div>
    );
  }

  if (isRound4) {
    return (
      <motion.div
        whileHover={{ y: -8, scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className="relative cursor-pointer rounded-xl border-2 border-primary/30 bg-gradient-to-br from-card to-secondary/40 p-6 text-center transition-shadow duration-500 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5),0_0_60px_hsl(var(--primary)/0.2)] hover:border-primary/70"
      >
        <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />
        <div className={`text-6xl md:text-7xl font-bold mb-1 ${suit.color} drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]`}>
          {face.label}
        </div>
        <div className={`text-3xl mb-2 ${suit.color}`}>{face.symbol}</div>
        <p className="font-display text-xs tracking-wider text-muted-foreground">{suit.name}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.06, boxShadow: "0 0 30px hsl(348 100% 50% / 0.4)" }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="suit-card rounded-xl p-6 text-center cursor-pointer group"
    >
      <motion.div
        className={`text-6xl md:text-7xl mb-3 ${suit.color} transition-all duration-300 group-hover:drop-shadow-[0_0_20px_hsl(var(--primary)/0.7)]`}
        whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
      >
        {suit.symbol}
      </motion.div>
      <p className="font-display text-sm tracking-wider text-muted-foreground">{suit.name}</p>
    </motion.div>
  );
};

export default PlayingCard;
