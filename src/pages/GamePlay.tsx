import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Timer, Users, Skull, CheckCircle, Loader2, Maximize2 } from "lucide-react";
import PlayingCard from "@/components/game/PlayingCard";
import QuestionModal from "@/components/game/QuestionModal";

const SUITS = [
  { key: "spades", symbol: "♠", name: "Logic Puzzles", color: "text-foreground" },
  { key: "hearts", symbol: "♥", name: "Riddles & Patterns", color: "text-primary" },
  { key: "diamonds", symbol: "♦", name: "Coding Challenges", color: "text-primary" },
  { key: "clubs", symbol: "♣", name: "Tech Flow", color: "text-foreground" },
];

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  points: number;
  image_url?: string | null;
};

const GamePlay = () => {
  const navigate = useNavigate();
  const gameId = localStorage.getItem("game_id");
  const teamId = localStorage.getItem("team_id");

  const [currentRound, setCurrentRound] = useState(0);
  const [gameStatus, setGameStatus] = useState("");
  const [roundStartedAt, setRoundStartedAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [suitLocked, setSuitLocked] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [members, setMembers] = useState<{ id: string; name: string; is_eliminated: boolean }[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [totalAnswerTime, setTotalAnswerTime] = useState(0);
  const [usedSuits, setUsedSuits] = useState<string[]>([]);
  const [roundComplete, setRoundComplete] = useState(false);
  const [frozenTime, setFrozenTime] = useState<number | null>(null);
  const [previousRoundsTime, setPreviousRoundsTime] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Shuffle suits randomly per render
  const shuffledSuits = useMemo(() => [...SUITS].sort(() => Math.random() - 0.5), [currentRound]);

  useEffect(() => {
    if (!gameId || !teamId) { navigate("/"); return; }

    const fetchState = async () => {
      const { data: game } = await supabase.from("games").select("status, current_round, round_started_at").eq("id", gameId).single();
      if (game) { setGameStatus(game.status); setCurrentRound(game.current_round); setRoundStartedAt(game.round_started_at); }

      const { data: mems } = await supabase.from("members").select("id, name, is_eliminated").eq("team_id", teamId);
      if (mems) setMembers(mems);

      const { data: allRoundScores } = await supabase.from("round_scores").select("suit_chosen, score, round_number").eq("team_id", teamId).eq("game_id", gameId);
      if (allRoundScores) {
        const previousSuits = allRoundScores.filter(rs => rs.round_number !== (game?.current_round || 0) && rs.suit_chosen).map(rs => rs.suit_chosen!);
        setUsedSuits(previousSuits);
        const currentRs = allRoundScores.find(rs => rs.round_number === (game?.current_round || 0));
        if (currentRs?.suit_chosen) { setSelectedSuit(currentRs.suit_chosen); setSuitLocked(true); setScore(currentRs.score); }
      }
    };
    fetchState();

    const channel = supabase.channel("game-play")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (payload) => {
        const g = payload.new;
        setGameStatus(g.status as string);
        setCurrentRound(g.current_round as number);
        setRoundStartedAt(g.round_started_at as string | null);
        if (g.status === "between_rounds" || g.status === "finished") setShowResults(true);
        if (["round1", "round2", "round3", "round4"].includes(g.status as string)) {
          setPreviousRoundsTime(prev => frozenTime !== null ? frozenTime : prev);
          setSelectedSuit(null); setSuitLocked(false); setQuestions([]); setCurrentQ(0);
          setScore(0); setAnswer(""); setShowResults(false); setRoundComplete(false); setFrozenTime(null);
          supabase.from("round_scores").select("suit_chosen, round_number").eq("team_id", teamId!).eq("game_id", gameId!)
            .then(({ data }) => {
              if (data) {
                const newRound = g.current_round as number;
                setUsedSuits(data.filter(rs => rs.round_number !== newRound && rs.suit_chosen).map(rs => rs.suit_chosen!));
              }
            });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => {
        supabase.from("members").select("id, name, is_eliminated").eq("team_id", teamId!).then(({ data }) => { if (data) setMembers(data); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, teamId, navigate]);

  useEffect(() => {
    if (!roundStartedAt || !currentRound || roundComplete) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(roundStartedAt).getTime()) / 1000);
      setTimeLeft(previousRoundsTime + elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [roundStartedAt, currentRound, roundComplete, previousRoundsTime]);

  const selectSuit = async (suit: string) => {
    if (suitLocked) return;
    setSelectedSuit(suit);
    setSuitLocked(true);
    await supabase.from("round_scores").upsert({ team_id: teamId!, game_id: gameId!, round_number: currentRound, suit_chosen: suit, score: 0 }, { onConflict: "team_id,game_id,round_number" });
    const { data: qs } = await supabase.from("questions").select("id, question_text, question_type, options, correct_answer, points, image_url").eq("round_number", currentRound).eq("suit", suit);
    if (qs) { setQuestions(qs); setQuestionStartTime(Date.now()); setTotalAnswerTime(0); }
  };

  const submitAnswer = async () => {
    if (!questions[currentQ]) return;
    const q = questions[currentQ];
    const isCorrect = answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
    const earned = isCorrect ? q.points : 0;
    const newScore = score + earned;
    setScore(newScore);
    const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
    const newTotalTime = totalAnswerTime + elapsed;
    setTotalAnswerTime(newTotalTime);

    if (isCorrect) toast({ title: `+${q.points} points!`, description: `Correct! (${elapsed}s)` });
    else toast({ title: "Wrong!", description: `Answer: ${q.correct_answer}`, variant: "destructive" });

    await supabase.from("round_scores").update({ score: newScore, answer_time_seconds: newTotalTime }).eq("team_id", teamId!).eq("game_id", gameId!).eq("round_number", currentRound);
    const { data: allScores } = await supabase.from("round_scores").select("score").eq("team_id", teamId!).eq("game_id", gameId!);
    const totalScore = allScores?.reduce((acc, s) => acc + s.score, 0) || 0;
    await supabase.from("teams").update({ total_score: totalScore }).eq("id", teamId!);

    setAnswer("");
    if (currentQ + 1 < questions.length) { setCurrentQ(currentQ + 1); setQuestionStartTime(Date.now()); }
    else { setRoundComplete(true); setFrozenTime(timeLeft); setShowResults(true); toast({ title: "Round complete!", description: `Score: ${newScore} | Time: ${timeLeft}s` }); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const isRoundActive = ["round1", "round2", "round3", "round4"].includes(gameStatus);
  const isRound4 = currentRound === 4;
  const currentQuestion = questions[currentQ];
  const isLongQuestion = currentQuestion && currentQuestion.question_text.length > 120;

  if (gameStatus === "finished") { navigate("/game/results"); return null; }

  if (gameStatus === "waiting") {
    return (
      <div className="min-h-screen arena-bg flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
          <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
          <h2 className="font-display text-3xl text-primary neon-text">GAME NOT STARTED</h2>
          <p className="text-muted-foreground font-body text-lg animate-pulse-glow">Waiting for admin to start Round 1...</p>
        </motion.div>
      </div>
    );
  }

  if (gameStatus === "between_rounds" || (showResults && !isRoundActive)) {
    return (
      <div className="min-h-screen arena-bg flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
          <h2 className="font-display text-3xl text-primary neon-text">ROUND {currentRound} COMPLETE</h2>
          <p className="font-display text-5xl text-foreground">{score} PTS</p>
          <p className="text-muted-foreground font-body text-lg animate-pulse-glow">
            {currentRound < 4 ? `Waiting for admin to start Round ${currentRound + 1}...` : "Waiting for final results..."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {members.map(m => (
              <div key={m.id} className={`glass-card px-4 py-2 rounded-lg ${m.is_eliminated ? "opacity-30 line-through" : ""}`}>
                {m.is_eliminated && <Skull className="inline h-4 w-4 text-destructive mr-1" />}
                <span className="font-body">{m.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen arena-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-primary tracking-wider">
              ROUND {currentRound} — {currentRound === 1 ? "Entry Game" : currentRound === 2 ? "Mind Trap" : currentRound === 3 ? "Betrayal Stage" : "Final Showdown"}
            </h2>
            <p className="font-body text-muted-foreground">Score: {score}</p>
          </div>
          <div className="font-display text-3xl tracking-wider text-primary">
            <Timer className="inline h-6 w-6 mr-2" />
            {formatTime(frozenTime !== null ? frozenTime : timeLeft)}
          </div>
        </div>

        {/* Members */}
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <div key={m.id} className={`glass-card px-3 py-1.5 rounded-full text-sm font-body flex items-center gap-1 ${m.is_eliminated ? "opacity-30" : ""}`}>
              {m.is_eliminated ? <Skull className="h-3 w-3 text-destructive" /> : <Users className="h-3 w-3 text-primary" />}
              {m.name}
            </div>
          ))}
        </div>

        {/* Card Selection with animations */}
        {!suitLocked && isRoundActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {shuffledSuits.map((suit, i) => (
              <motion.div
                key={suit.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <PlayingCard
                  suit={suit}
                  isUsed={usedSuits.includes(suit.key)}
                  isRound4={isRound4}
                  onClick={() => selectSuit(suit.key)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Question area with slide animation */}
        <AnimatePresence mode="wait">
          {suitLocked && questions.length > 0 && currentQ < questions.length && isRoundActive && (
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35 }}
            >
              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {/* Selected suit indicator */}
                      <span className={`text-3xl ${SUITS.find(s => s.key === selectedSuit)?.color}`}>
                        {SUITS.find(s => s.key === selectedSuit)?.symbol}
                      </span>
                      <span className="font-display text-sm text-muted-foreground">Q{currentQ + 1}/{questions.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm text-primary">{currentQuestion.points} pts</span>
                      {isLongQuestion && (
                        <Button size="icon" variant="ghost" onClick={() => setModalOpen(true)}>
                          <Maximize2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Question image */}
                  {currentQuestion.image_url && (
                    <img src={currentQuestion.image_url} alt="Question" className="w-full max-h-48 object-contain rounded-lg" />
                  )}

                  <p className={`font-body text-lg text-foreground ${isLongQuestion ? "line-clamp-3 cursor-pointer" : ""}`}
                    onClick={() => isLongQuestion && setModalOpen(true)}>
                    {currentQuestion.question_text}
                  </p>

                  {currentQuestion.options && Array.isArray(currentQuestion.options) && (currentQuestion.options as string[]).length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {(currentQuestion.options as string[]).map((opt, i) => (
                        <Button key={i} variant={answer === opt ? "default" : "outline"}
                          onClick={() => setAnswer(opt)}
                          className={`justify-start text-left font-body ${answer === opt ? "bg-primary" : "border-primary/20"}`}>
                          {opt}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Input placeholder="Your answer..." value={answer} onChange={e => setAnswer(e.target.value)}
                      className="bg-secondary border-primary/20 font-body text-lg" onKeyDown={e => e.key === "Enter" && submitAnswer()} />
                  )}

                  <Button onClick={submitAnswer} disabled={!answer.trim()} className="w-full font-display tracking-wider bg-primary hover:bg-primary/80 neon-border">
                    <CheckCircle className="mr-2 h-4 w-4" /> SUBMIT
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal for long questions */}
        <QuestionModal open={modalOpen} onClose={() => setModalOpen(false)}
          questionText={currentQuestion?.question_text || ""} imageUrl={currentQuestion?.image_url} />

        {/* Round complete */}
        {suitLocked && questions.length > 0 && currentQ >= questions.length && isRoundActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h3 className="font-display text-2xl text-primary neon-text">ROUND {currentRound} COMPLETE</h3>
            <p className="font-display text-4xl text-foreground">{score} PTS</p>
            <p className="text-muted-foreground font-body text-lg animate-pulse-glow">Waiting for admin to end the round...</p>
          </motion.div>
        )}

        {suitLocked && questions.length === 0 && (
          <div className="text-center py-12">
            <p className="font-display text-xl text-muted-foreground">No questions available for this suit yet.</p>
            <p className="font-body text-muted-foreground mt-2">The admin will add questions soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePlay;
