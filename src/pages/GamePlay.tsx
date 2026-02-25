import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Skull, CheckCircle, Loader2, Maximize2, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
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
  { key: "spades", symbol: "♠", name: "Spades", color: "text-foreground" },
  { key: "hearts", symbol: "♥", name: "Hearts", color: "text-primary" },
  { key: "diamonds", symbol: "♦", name: "Diamonds", color: "text-primary" },
  { key: "clubs", symbol: "♣", name: "Clubs", color: "text-foreground" },
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
  const [isPaused, setIsPaused] = useState(false);
  const [totalPausedSeconds, setTotalPausedSeconds] = useState(0);
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const [suitChosenAt, setSuitChosenAt] = useState<string | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const isSubmittingRef = useRef(false);
  const completedQRef = useRef<Set<number>>(new Set());
  const draftAnswersRef = useRef<Map<number, string>>(new Map());
  const questionScoresRef = useRef<Map<number, number>>(new Map());

  // Duplicate tab detection — only one tab per team allowed
  useEffect(() => {
    if (!teamId) return;
    const channel = new BroadcastChannel(`borderland-team-${teamId}`);
    // Tell any existing tabs that this tab is taking over
    channel.postMessage({ type: "SESSION_TAKEOVER" });
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "SESSION_TAKEOVER" && isActive) {
        toast({ title: "Session Taken Over", description: "Another tab has connected for your team. This tab will be redirected.", variant: "destructive" });
        isActive = false;
        setTimeout(() => navigate("/"), 2000);
      }
    };
    channel.addEventListener("message", handleMessage);
    return () => { isActive = false; clearTimeout(timer); channel.removeEventListener("message", handleMessage); channel.close(); };
  }, [teamId, navigate]);

  // Shuffle suits randomly per render
  const shuffledSuits = useMemo(() => [...SUITS].sort(() => Math.random() - 0.5), [currentRound]);

  useEffect(() => {
    if (!gameId || !teamId) { navigate("/"); return; }

    const fetchState = async () => {
      console.log("[DEBUG] fetchState called - gameId:", gameId, "teamId:", teamId);
      const { data: game, error: gameErr } = await (supabase.from("games").select("*") as any).eq("id", gameId).single();
      console.log("[DEBUG] game data:", game, "error:", gameErr);
      if (game) {
        setGameStatus(game.status);
        setCurrentRound(game.current_round);
        setRoundStartedAt(game.round_started_at);
        setIsPaused(game.is_paused || false);
        setPausedAt(game.paused_at || null);
        setTotalPausedSeconds(game.total_paused_seconds || 0);
      }
      fetchLeaderboard();

      const { data: mems, error: memsErr } = await supabase.from("members").select("id, name, is_eliminated").eq("team_id", teamId);
      console.log("[DEBUG] members data:", mems, "error:", memsErr);
      if (mems) setMembers(mems);

      const { data: allRoundScores } = await (supabase.from("round_scores").select("*") as any).eq("team_id", teamId).eq("game_id", gameId);
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
            const restoredQIndex = currentRs.current_q_index || 0;
            setCurrentQ(restoredQIndex);

            // Restore completedQRef so previously answered questions are marked done
            completedQRef.current = new Set(Array.from({ length: restoredQIndex }, (_, i) => i));

            // Restore suit_chosen_at for timer
            if (currentRs.suit_chosen_at) setSuitChosenAt(currentRs.suit_chosen_at);
            const { data: qs } = await supabase.from("questions").select("id, question_text, question_type, options, correct_answer, points, image_url, question_number").eq("game_id", gameId).eq("round_number", game.current_round).eq("suit", currentRs.suit_chosen).order("question_number");
            if (qs) {
              setQuestions(qs as Question[]);
              if ((currentRs.current_q_index || 0) >= qs.length && qs.length > 0) {
                setShowResults(true);
                setRoundComplete(true);
              }
            }
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
        setIsPaused(g.is_paused as boolean || false);
        setPausedAt(g.paused_at as string | null);
        setTotalPausedSeconds(g.total_paused_seconds as number || 0);
        if (g.status === "between_rounds" || g.status === "finished") {
          setShowResults(true);
          fetchLeaderboard();
        }
        if (["round1", "round2", "round3", "round4"].includes(g.status as string)) {
          setPreviousRoundsTime(prev => frozenTime !== null ? frozenTime : prev);
          setSelectedSuit(null); setSuitLocked(false); setQuestions([]); setCurrentQ(0); setActiveMemberId(null);
          setScore(0); setAnswer(""); setShowResults(false); setRoundComplete(false); setFrozenTime(null);
          completedQRef.current.clear(); // Reset submission lock for the new round

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
    if (!suitChosenAt || !currentRound || roundComplete || isPaused || timeExpired) return;
    const ROUND_TIMES_INNER: Record<number, number> = { 1: 10 * 60, 2: 20 * 60, 3: 30 * 60, 4: 30 * 60 };
    const limit = ROUND_TIMES_INNER[currentRound] || 30 * 60;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(suitChosenAt).getTime()) / 1000);
      const currentPauseDuration = pausedAt ? Math.floor((Date.now() - new Date(pausedAt).getTime()) / 1000) : 0;
      const effectiveElapsed = elapsed - totalPausedSeconds - currentPauseDuration;
      const clamped = Math.max(0, effectiveElapsed);
      setTimeLeft(clamped);

      // Auto-lock when time exceeds the round limit
      if (clamped >= limit) {
        setTimeExpired(true);
        setFrozenTime(limit);
        setRoundComplete(true);
        setShowResults(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [suitChosenAt, currentRound, roundComplete, isPaused, totalPausedSeconds, pausedAt, timeExpired]);

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
    const chosenAtNow = new Date().toISOString();
    setSuitChosenAt(chosenAtNow);
    await supabase.from("round_scores").upsert({ team_id: teamId!, game_id: gameId!, round_number: currentRound, suit_chosen: suit, active_member_id: activeMemberId, suit_chosen_at: chosenAtNow } as any, { onConflict: "team_id,game_id,round_number" });
    const { data: qs } = await supabase.from("questions").select("id, question_text, question_type, options, correct_answer, points, image_url, question_number").eq("game_id", gameId).eq("round_number", currentRound).eq("suit", suit).order("question_number");
    if (qs) { setQuestions(qs as Question[]); setQuestionStartTime(Date.now()); setTotalAnswerTime(0); }
  };

  const submitAnswer = async (submittedAnswer: string) => {
    if (!questions[currentQ] || isSubmitting || isSubmittingRef.current || timeExpired) return;
    // Only allow re-submission in rounds 3 and 4
    const allowResubmit = currentRound === 3 || currentRound === 4;
    if (!allowResubmit && completedQRef.current.has(currentQ)) return;

    // Lock synchronously to prevent rapid-fire Enter spam
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Allow overriding the answer from the view
      let finalAnswer = submittedAnswer || answer;
      const q = questions[currentQ];

      let earned = 0;
      let isTestCasePipelinePayload = false;

      // Detect test case pipeline payloads from Rounds 3 & 4
      if (currentRound === 3 || currentRound === 4) {
        try {
          const parsed = JSON.parse(finalAnswer);
          if (parsed.testCasePipeline || parsed.isAutopsyPipeline) {
            earned = parsed.score || 0;
            isTestCasePipelinePayload = true;
          }
        } catch (e) { }
      }

      // If it's a test case pipeline payload, the score is already computed
      // by the frontend based on Piston execution results.
      // Otherwise fallback to legacy matching for other rounds.
      const isCorrect = isTestCasePipelinePayload ? true : finalAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

      if (!isTestCasePipelinePayload) {
        earned = isCorrect ? q.points : 0;
      }

      // Best-score-wins: only increase if new score is higher than previous attempt
      const previousBest = questionScoresRef.current.get(currentQ) || 0;
      const isResubmission = completedQRef.current.has(currentQ);

      if (earned > previousBest) {
        // New score is better — update the difference
        const scoreDelta = earned - previousBest;
        questionScoresRef.current.set(currentQ, earned);
        const newScore = score + scoreDelta;
        setScore(newScore);

        toast({
          title: isResubmission ? "IMPROVED! Score Updated" : "Answer Encrypted & Locked",
          description: isResubmission ? `Score improved: ${previousBest} → ${earned} (+${scoreDelta} pts)` : "Awaiting final round tabulation..."
        });

        // Update DB
        const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
        const newTotalTime = totalAnswerTime + elapsed;
        setTotalAnswerTime(newTotalTime);
        await supabase.from("round_scores").update({
          score: newScore,
          answer_time_seconds: newTotalTime,
          current_q_index: Math.max(currentQ + 1, ...Array.from(completedQRef.current).map(i => i + 1))
        }).eq("team_id", teamId!).eq("game_id", gameId!).eq("round_number", currentRound);
      } else {
        // Score not better
        if (isResubmission) {
          toast({ title: "No improvement", description: `Previous best: ${previousBest} pts. This attempt: ${earned} pts. Keeping best score.` });
        } else {
          questionScoresRef.current.set(currentQ, earned);
          const newScore = score + earned;
          setScore(newScore);
          toast({ title: "Answer Encrypted & Locked", description: "Awaiting final round tabulation..." });

          const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
          const newTotalTime = totalAnswerTime + elapsed;
          setTotalAnswerTime(newTotalTime);
          await supabase.from("round_scores").update({
            score: newScore,
            answer_time_seconds: newTotalTime,
            current_q_index: Math.max(currentQ + 1, ...Array.from(completedQRef.current).map(i => i + 1))
          }).eq("team_id", teamId!).eq("game_id", gameId!).eq("round_number", currentRound);
        }
      }

      // Mark as completed
      completedQRef.current.add(currentQ);
      // Clear draft for this question
      draftAnswersRef.current.delete(currentQ);

      const nextQIndex = currentQ + 1;
      // Only auto-advance if this was a first-time submission
      if (!isResubmission) {
        if (nextQIndex < questions.length) {
          // Find next unsolved question
          let nextUnsolved = -1;
          for (let i = nextQIndex; i < questions.length; i++) {
            if (!completedQRef.current.has(i)) { nextUnsolved = i; break; }
          }
          if (nextUnsolved !== -1) {
            setCurrentQ(nextUnsolved);
            setAnswer(draftAnswersRef.current.get(nextUnsolved) || "");
          } else {
            // Check for unsolved before current
            const unsolvedIndex = questions.findIndex((_, idx) => !completedQRef.current.has(idx));
            if (unsolvedIndex !== -1) {
              setCurrentQ(unsolvedIndex);
              setAnswer(draftAnswersRef.current.get(unsolvedIndex) || "");
              toast({ title: "Questions remaining", description: `Navigated to unsolved question ${unsolvedIndex + 1}.` });
            } else {
              setRoundComplete(true);
              setFrozenTime(timeLeft);
              setShowResults(true);
              toast({ title: "Round complete!", description: "Awaiting admin confirmation." });
            }
          }
        } else {
          const unsolvedIndex = questions.findIndex((_, idx) => !completedQRef.current.has(idx));
          if (unsolvedIndex !== -1) {
            setCurrentQ(unsolvedIndex);
            setAnswer(draftAnswersRef.current.get(unsolvedIndex) || "");
            toast({ title: "Questions remaining", description: `Navigated to unsolved question ${unsolvedIndex + 1}.` });
          } else {
            setRoundComplete(true);
            setFrozenTime(timeLeft);
            setShowResults(true);
            toast({ title: "Round complete!", description: "Awaiting admin confirmation." });
          }
        }
      }
      setQuestionStartTime(Date.now());
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Navigate to a specific question
  const goToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    // Save current answer as draft before navigating away
    if (answer.trim()) {
      draftAnswersRef.current.set(currentQ, answer);
    }
    // Restore draft for the target question (if any)
    const savedDraft = draftAnswersRef.current.get(index) || "";
    setCurrentQ(index);
    setAnswer(savedDraft);
    setQuestionStartTime(Date.now());
  };

  const skipQuestion = () => {
    // Find the next unsolved question after current
    for (let i = currentQ + 1; i < questions.length; i++) {
      if (!completedQRef.current.has(i)) {
        goToQuestion(i);
        return;
      }
    }
    // Wrap around: find unsolved before current
    for (let i = 0; i < currentQ; i++) {
      if (!completedQRef.current.has(i)) {
        goToQuestion(i);
        return;
      }
    }
    toast({ title: "No more questions", description: "All questions have been answered." });
  };

  const prevQuestion = () => {
    // Find the previous unsolved question
    for (let i = currentQ - 1; i >= 0; i--) {
      if (!completedQRef.current.has(i)) {
        goToQuestion(i);
        return;
      }
    }
    toast({ title: "No previous unsolved questions" });
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

  // Per-round time limits in seconds
  const ROUND_TIMES: Record<number, number> = { 1: 10 * 60, 2: 20 * 60, 3: 30 * 60, 4: 30 * 60 };
  const TOTAL_ROUND_TIME = ROUND_TIMES[currentRound] || 30 * 60;

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

  if (gameStatus === "between_rounds" || showResults) {
    return (
      <div className="min-h-screen arena-bg flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
          {timeExpired ? (
            <>
              <Skull className="h-16 w-16 text-destructive mx-auto animate-pulse" />
              <h2 className="font-display text-4xl text-destructive neon-text tracking-widest">TIME'S UP</h2>
              <p className="text-muted-foreground font-body text-lg">Your answers have been locked.</p>
            </>
          ) : (
            <>
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <h2 className="font-display text-3xl text-primary neon-text">ROUND {currentRound} COMPLETE</h2>
            </>
          )}
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

      {/* Paused Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <Loader2 className="h-16 w-16 text-amber-400 mx-auto animate-spin" />
            <h2 className="font-display text-4xl text-amber-400 tracking-widest neon-text">ROUND PAUSED</h2>
            <p className="text-muted-foreground font-body text-lg animate-pulse-glow">Admin has paused the round. Please wait...</p>
          </motion.div>
        </div>
      )}

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
                {questions.length > 0 && currentQ < questions.length ? (
                  <div className="w-full space-y-4">
                    {/* Question Progress Dots */}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {questions.map((_, idx) => {
                        const isCompleted = completedQRef.current.has(idx);
                        const isCurrent = idx === currentQ;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              const canRetry = (currentRound === 3 || currentRound === 4) || !isCompleted;
                              if (canRetry) goToQuestion(idx);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all
                              ${isCompleted && !isCurrent ? `bg-green-500/80 text-black ${(currentRound === 3 || currentRound === 4) ? 'hover:bg-green-400 cursor-pointer' : 'cursor-not-allowed'}` : ''}
                              ${isCurrent ? 'bg-cyan-500 text-black scale-110 ring-2 ring-cyan-400/50 cursor-pointer' : ''}
                              ${!isCurrent && !isCompleted ? 'bg-white/10 text-white/50 hover:bg-white/20 cursor-pointer' : ''}
                            `}
                            title={isCompleted ? ((currentRound === 3 || currentRound === 4) ? `Q${idx + 1} ✓ (click to retry)` : `Q${idx + 1} ✓ Submitted`) : `Go to Q${idx + 1}`}
                          >
                            {isCompleted ? '✓' : idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevQuestion}
                        className="text-muted-foreground hover:text-primary font-mono text-xs"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> PREV
                      </Button>
                      <span className="text-xs font-mono text-muted-foreground">
                        Q{currentQ + 1}/{questions.length} — {completedQRef.current.size} answered
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={skipQuestion}
                        className="text-muted-foreground hover:text-primary font-mono text-xs"
                      >
                        SKIP <SkipForward className="w-4 h-4 ml-1" />
                      </Button>
                    </div>

                    {/* Round View */}
                    {renderRoundView()}
                  </div>
                ) : (
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
