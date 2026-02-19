import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type QuestionModalProps = {
  open: boolean;
  onClose: () => void;
  questionText: string;
  imageUrl?: string | null;
};

const QuestionModal = ({ open, onClose, questionText, imageUrl }: QuestionModalProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card rounded-2xl max-w-lg w-full p-8 relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          {imageUrl && (
            <img src={imageUrl} alt="Question" className="w-full max-h-64 object-contain rounded-lg mb-4" />
          )}
          <p className="font-body text-lg text-foreground leading-relaxed">{questionText}</p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default QuestionModal;
