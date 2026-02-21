import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Skull, CheckCircle, Loader2, Maximize2 } from "lucide-react";
import PlayingCard from "@/components/game/PlayingCard";
import QuestionModal from "@/components/game/QuestionModal";
import OrbitalTimer from "@/components/game/OrbitalTimer";
import AtmosphericBreach from "@/components/game/AtmosphericBreach";

// Import Round Views (to be created)
import Round1View from "@/components/game/rounds/Round1View";
import Round2View from "@/components/game/rounds/Round2View";
import Round3View from "@/components/game/rounds/Round3View";
import Round4View from "@/components/game/rounds/Round4View";

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
  question_number: number;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ id: string; name: string; total_score: number; is_disqualified: boolean; ban_count: number }[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [playedMemberIds, setPlayedMemberIds] = useState<string[]>([]);
  const isSubmittingRef = useRef(false);

  // Shuffle suits randomly per render
  const shuffledSuits = useMemo(() => [...SUITS].sort(() => Math.random() - 0.5), [currentRound]);

  useEffect(() => {
    if (!gameId || !teamId) { navigate("/"); return; }

    const fetchState = async () => {
      const { data: game } = await supabase.from("games").select("status, current_round, round_started_at").eq("id", gameId).single();
      if (game) {
        setGameStatus(game.status);
        setCurrentRound(game.current_round);
        setRoundStartedAt(game.round_started_at);
      }
      fetchLeaderboard();

      const { data: mems } = await supabase.from("members").select("id, name, is_eliminated").eq("team_id", teamId);
      if (mems) setMembers(mems);

      const { data: allRoundScores } = await supabase.from("round_scores").select("suit_chosen, score, round_number, current_q_index, active_member_id").eq("team_id", teamId).eq("game_id", gameId);
      if (allRoundScores) {
        const previousSuits = allRoundScores.filter(rs => rs.round_number !== (game?.current_round || 0) && rs.suit_chosen).map(rs => rs.suit_chosen!);
        setUsedSuits(previousSuits);

        const playedIds = allRoundScores.filter(rs => rs.round_number !== (game?.current_round || 0) && rs.active_member_id).map(rs => rs.active_member_id!);
        setPlayedMemberIds(playedIds);

        const currentRs = allRoundScores.find(rs => rs.round_number === (game?.current_round || 0));
        if (currentRs) {
          if (currentRs.active_member_id) setActiveMemberId(currentRs.active_member_id);
          if (currentRs.suit_chosen) {
            setSelectedSuit(currentRs.suit_chosen);
            setSuitLocked(true);
            setScore(currentRs.score);
            setCurrentQ(currentRs.current_q_index || 0);
          }
        }
      }
    };
    fetchState();

    const channel = supabase.channel("game-play")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (payload) => {
        const g = payload.new;
        setGameStatus(g.status as string);
        setCurrentRound(g.current_round as number);
        setRoundStartedAt(g.round_started_at as string | null);
        if (g.status === "between_rounds" || g.status === "finished") {
          setShowResults(true);
          fetchLeaderboard();
        }
        if (["round1", "round2", "round3", "round4"].includes(g.status as string)) {
          setPreviousRoundsTime(prev => frozenTime !== null ? frozenTime : prev);
          setSelectedSuit(null); setSuitLocked(false); setQuestions([]); setCurrentQ(0); setActiveMemberId(null);
          setScore(0); setAnswer(""); setShowResults(false); setRoundComplete(false); setFrozenTime(null);

          const newRound = g.current_round as number;
          supabase.from("round_scores").select("suit_chosen, round_number, active_member_id").eq("team_id", teamId!).eq("game_id", gameId!)
            .then(({ data }) => {
              if (data) {
                setUsedSuits(data.filter(rs => rs.round_number !== newRound && rs.suit_chosen).map(rs => rs.suit_chosen!));
                setPlayedMemberIds(data.filter(rs => rs.round_number !== newRound && rs.active_member_id).map(rs => rs.active_member_id!));
              }
            });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => {
        supabase.from("members").select("id, name, is_eliminated").eq("team_id", teamId!).then(({ data }) => { if (data) setMembers(data); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${gameId}` }, () => { fetchLeaderboard(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "round_scores", filter: `game_id=eq.${gameId}` }, () => { fetchLeaderboard(); })
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

  const fetchLeaderboard = async () => {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, is_disqualified, ban_count")
      .eq("game_id", gameId);

    if (!teamsData) return;

    const { data: scoresData } = await supabase
      .from("round_scores")
      .select("team_id, score, answer_time_seconds")
      .eq("game_id", gameId);

    const compiledTeams = teamsData.map(team => {
      const teamScores = scoresData?.filter(s => s.team_id === team.id) || [];
      const totalScore = teamScores.reduce((acc, s) => acc + (s.score || 0), 0);
      const totalTime = teamScores.reduce((acc, s) => acc + (s.answer_time_seconds || 0), 0);
      return { ...team, total_score: totalScore, total_time: totalTime };
    });

    compiledTeams.sort((a, b) => b.total_score - a.total_score || a.total_time - b.total_time);

    setLeaderboard(compiledTeams.slice(0, 5));
  };

  const selectOperative = async (memberId: string) => {
    setActiveMemberId(memberId);
    await supabase.from("round_scores").upsert(
      { team_id: teamId!, game_id: gameId!, round_number: currentRound, active_member_id: memberId, score: 0 },
      { onConflict: "team_id,game_id,round_number" }
    );
  };

  const selectSuit = async (suit: string) => {
    if (suitLocked || !activeMemberId) return;
    setSelectedSuit(suit);
    setSuitLocked(true);
    await supabase.from("round_scores").upsert({ team_id: teamId!, game_id: gameId!, round_number: currentRound, suit_chosen: suit, active_member_id: activeMemberId }, { onConflict: "team_id,game_id,round_number" });
    const { data: qs } = await supabase.from("questions").select("id, question_text, question_type, options, correct_answer, points, image_url, question_number").eq("round_number", currentRound).eq("suit", suit).order("question_number");
    if (qs) { setQuestions(qs as Question[]); setQuestionStartTime(Date.now()); setTotalAnswerTime(0); }
  };

  const submitAnswer = async (submittedAnswer: string) => {
    if (!questions[currentQ] || isSubmitting || isSubmittingRef.current) return;

    // Lock synchronously to prevent rapid-fire Enter spam
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Allow overriding the answer from the view
      const finalAnswer = submittedAnswer || answer;
      const q = questions[currentQ];
      const isCorrect = finalAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      const earned = isCorrect ? q.points : 0;
      const newScore = score + earned;
      const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
      const newTotalTime = totalAnswerTime + elapsed;

      setScore(newScore);
      setTotalAnswerTime(newTotalTime);

      // Hide the correct answers from the players to prevent team leakage!
      toast({ title: "Answer Encrypted & Locked", description: "Awaiting final round tabulation..." });

      const nextQIndex = currentQ + 1;
      await supabase.from("round_scores").update({
        score: newScore,
        answer_time_seconds: newTotalTime,
        current_q_index: nextQIndex
      }).eq("team_id", teamId!).eq("game_id", gameId!).eq("round_number", currentRound);

      setAnswer("");
      if (nextQIndex < questions.length) {
        setCurrentQ(nextQIndex);
        setQuestionStartTime(Date.now());
      } else {
        setRoundComplete(true);
        setFrozenTime(timeLeft);
        setShowResults(true);
        toast({ title: "Round complete!", description: "Awaiting admin confirmation." });
      }
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const renderLeaderboardUI = () => {
    if (leaderboard.length === 0) return null;
    return (
      <div className="max-w-md mx-auto bg-black/40 border border-primary/20 rounded-xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] mt-8">
        <h3 className="font-display text-xl text-primary mb-4 tracking-widest text-center">TOP RANKINGS</h3>
        <div className="space-y-3">
          {leaderboard.map((team, index) => (
            <div key={team.id} className={`flex items-center justify-between p-3 rounded bg-black/60 border ${team.id === teamId ? 'border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]' : 'border-white/5'} ${team.is_disqualified ? 'opacity-30' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  #{index + 1}
                </span>
                <span className={`font-body truncate max-w-[150px] ${team.id === teamId ? 'text-primary font-bold' : 'text-gray-300'}`}>
                  {team.name} {team.id === teamId && "(You)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {team.is_disqualified ? (
                  <span className="text-destructive font-mono text-xs uppercase">Disqualified</span>
                ) : team.ban_count > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{team.total_score} <span className="text-xs text-muted-foreground font-normal">pts</span></span>
                    <span className="text-[10px] text-destructive font-mono font-bold">({team.ban_count} BANS)</span>
                  </div>
                ) : (
                  <span className="font-mono font-bold text-white">{team.total_score} <span className="text-xs text-muted-foreground font-normal">pts</span></span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper to render the correct view based on round
  const renderRoundView = () => {
    const commonProps = {
      currentQuestion: questions[currentQ],
      currentQ,
      totalQuestions: questions.length,
      answer,
      setAnswer,
      submitAnswer,
      isSubmitting,
      selectedSuit: SUITS.find(s => s.key === selectedSuit)
    };

    switch (currentRound) {
      case 1: return <Round1View {...commonProps} />;
      case 2: return <Round2View {...commonProps} />;
      case 3: return <Round3View {...commonProps} />;
      case 4: return <Round4View {...commonProps} isRound4={true} />;
      default: return <Round1View {...commonProps} />; // Fallback
    }
  };

  const isRoundActive = ["round1", "round2", "round3", "round4"].includes(gameStatus);
  const isRound4 = currentRound === 4;
  const currentQuestion = questions[currentQ];
  const isLongQuestion = currentQuestion && currentQuestion.question_text.length > 120;

  if (gameStatus === "finished") { navigate("/game/results"); return null; }

  // Total allowed time per round (placeholder logic, assuming 60 minutes)
  const TOTAL_ROUND_TIME = 60 * 60;

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
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {members.map(m => (
              <div key={m.id} className={`glass-card px-4 py-2 rounded-lg ${m.is_eliminated ? "opacity-30 line-through" : ""}`}>
                {m.is_eliminated && <Skull className="inline h-4 w-4 text-destructive mr-1" />}
                <span className="font-body">{m.name}</span>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          {renderLeaderboardUI()}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen arena-bg p-4 md:p-8 relative overflow-hidden">
      {/* Anti-Cheat Overlay */}
      <AtmosphericBreach active={isRoundActive} teamId={teamId || ""} gameId={gameId || ""} />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between glass-card p-4 rounded-xl">
          <div>
            <h2 className="font-display text-xl text-primary tracking-wider">
              ROUND {currentRound} — {currentRound === 1 ? "Entry Game" : currentRound === 2 ? "Mind Trap" : currentRound === 3 ? "Betrayal Stage" : "Final Showdown"}
            </h2>
            <p className="font-body text-muted-foreground">Team Score: {score}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-display">ORBITAL DECAY</p>
              <OrbitalTimer
                totalTime={TOTAL_ROUND_TIME}
                timeLeft={TOTAL_ROUND_TIME - (frozenTime !== null ? frozenTime : timeLeft)}
              />
            </div>
          </div>
        </div>

        {/* Member list */}
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {members.map(m => (
            <div key={m.id} className={`glass-card px-3 py-1.5 rounded-full text-sm font-body flex items-center gap-1 ${m.is_eliminated ? "opacity-30" : ""}`}>
              {m.is_eliminated ? <Skull className="h-3 w-3 text-destructive" /> : <Users className="h-3 w-3 text-primary" />}
              {m.name}
            </div>
          ))}
        </div>

        {/* Card Selection Area - The Zero-G Engine */}
        <div className="relative min-h-[400px] flex items-center justify-center">

          {/* Operative Selection Phase */}
          {!activeMemberId && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
              <Card className="glass-card border-primary">
                <CardContent className="p-8 text-center space-y-8">
                  <div>
                    <h3 className="font-display text-2xl text-primary tracking-widest neon-text">SELECT OPERATIVE</h3>
                    <p className="text-muted-foreground font-body mt-2">Choose the team member playing Round {currentRound}.<br />Operatives can only play one round per game.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {members.map(m => {
                      const hasPlayed = playedMemberIds.includes(m.id);
                      const isEliminated = m.is_eliminated;
                      const disabled = hasPlayed || isEliminated;

                      return (
                        <Button
                          key={m.id}
                          onClick={() => selectOperative(m.id)}
                          disabled={disabled}
                          className={`h-16 font-display tracking-wider text-lg ${disabled ? 'bg-secondary/50 border-white/5 opacity-50' : 'bg-primary/10 hover:bg-primary/30 border-primary/50 text-white shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.5)]'}`}
                          variant="outline"
                        >
                          <Users className="w-5 h-5 mr-3" />
                          {m.name}
                          {hasPlayed && <span className="ml-auto text-xs font-mono text-muted-foreground">(PLAYED)</span>}
                          {isEliminated && <span className="ml-auto text-xs font-mono text-destructive"><Skull className="w-4 h-4" /></span>}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* If no suit selected, show all cards floating */}
          {activeMemberId && !suitLocked && (
            <motion.div
              layoutId="card-container"
              className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {shuffledSuits.map((suit, index) => (
                <PlayingCard
                  key={suit.key}
                  suit={suit}
                  index={index}
                  isUsed={usedSuits.includes(suit.key)}
                  isRound4={isRound4}
                  onClick={() => selectSuit(suit.key)}
                />
              ))}
            </motion.div>
          )}

          {/* If suit selected, move selected card to center (conceptually) */}
          <AnimatePresence mode="wait">
            {activeMemberId && suitLocked && (
              <motion.div
                key="round-content"
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 50 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full"
              >
                {questions.length > 0 && currentQ < questions.length ? renderRoundView() : (
                  <Card className="glass-card w-full">
                    <CardContent className="p-12 text-center">
                      <p className="font-display text-xl text-muted-foreground">Initializing Module...</p>
                      {(questions.length === 0) && <p className="text-muted-foreground mt-2">Waiting for admin to inject protocol.</p>}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal for long questions */}
        <QuestionModal open={modalOpen} onClose={() => setModalOpen(false)}
          questionText={currentQuestion?.question_text || ""} imageUrl={currentQuestion?.image_url} />

        {/* Live Leaderboard for Active Round */}
        {renderLeaderboardUI()}
      </div>
    </div>
  );
};

export default GamePlay;
