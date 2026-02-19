import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import { Play, Pause, SkipForward, Plus, Users, Skull, Trophy, Copy, LogOut } from "lucide-react";
import QuestionManager from "@/components/admin/QuestionManager";

type Game = {
  id: string;
  join_code: string;
  name: string;
  status: string;
  current_round: number;
  round_started_at: string | null;
};

type Team = {
  id: string;
  name: string;
  total_score: number;
  total_time: number;
  round_scores: Record<number, number>;
  members: { id: string; name: string; is_eliminated: boolean; eliminated_round: number | null }[];
};

const ROUND_NAMES: Record<number, string> = { 1: "Entry Game", 2: "Mind Trap", 3: "Betrayal Stage", 4: "Final Showdown" };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      setUser(user);
      const { data: games } = await supabase.from("games").select("*").order("created_at", { ascending: false }).limit(1);
      if (games && games.length > 0) { setGame(games[0]); fetchTeams(games[0].id); }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!game) return;
    const channel = supabase.channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` }, (payload) => { if (payload.new) setGame(payload.new as Game); })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${game.id}` }, () => { fetchTeams(game.id); })
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => { fetchTeams(game.id); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [game?.id]);

  const fetchTeams = async (gameId: string) => {
    const { data: teamsData } = await supabase.from("teams").select("id, name, total_score").eq("game_id", gameId);
    if (!teamsData) return;
    const teamsWithMembers: Team[] = await Promise.all(
      teamsData.map(async (t) => {
        const { data: mems } = await supabase.from("members").select("id, name, is_eliminated, eliminated_round").eq("team_id", t.id);
        const { data: scores } = await supabase.from("round_scores").select("round_number, score, answer_time_seconds").eq("team_id", t.id).eq("game_id", gameId);
        const totalTime = scores?.reduce((acc, s) => acc + (s.answer_time_seconds || 0), 0) || 0;
        const totalScore = scores?.reduce((acc, s) => acc + (s.score || 0), 0) || 0;
        const roundScores: Record<number, number> = {};
        scores?.forEach((s) => { roundScores[s.round_number] = s.score; });
        return { ...t, total_score: totalScore, total_time: totalTime, round_scores: roundScores, members: mems || [] };
      })
    );
    teamsWithMembers.sort((a, b) => b.total_score - a.total_score || a.total_time - b.total_time);
    setTeams(teamsWithMembers);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const createGame = async () => {
    if (!user) return;
    const code = generateCode();
    const { data, error } = await supabase.from("games").insert({ admin_id: user.id, join_code: code, name: "Borderland Arena" }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setGame(data);
    toast({ title: "Game created!", description: `Code: ${code}` });
  };

  const startRound = async (round: number) => {
    if (!game) return;
    const statusMap: Record<number, string> = { 1: "round1", 2: "round2", 3: "round3", 4: "round4" };
    await supabase.from("games").update({ status: statusMap[round], current_round: round, round_started_at: new Date().toISOString() }).eq("id", game.id);
    toast({ title: `Round ${round} started!` });
  };

  const endRound = async () => {
    if (!game) return;
    await supabase.from("games").update({ status: "between_rounds" }).eq("id", game.id);
  };

  const finishGame = async () => {
    if (!game) return;
    await supabase.from("games").update({ status: "finished" }).eq("id", game.id);
  };

  const copyCode = () => {
    if (game) { navigator.clipboard.writeText(game.join_code); toast({ title: "Copied!" }); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      waiting: "⏳ Waiting for Teams", round1: "🔴 Round 1 — Entry Game", round2: "🔴 Round 2 — Mind Trap",
      round3: "🔴 Round 3 — Betrayal Stage", round4: "🔴 Round 4 — Final Showdown",
      between_rounds: "⏸ Between Rounds", finished: "🏆 Finished"
    };
    return map[s] || s;
  };

  return (
    <div className="min-h-screen arena-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wider text-primary neon-text">ADMIN DASHBOARD</h1>
          <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground"><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
        </div>

        {!game ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Button size="lg" onClick={createGame} className="font-display text-xl px-10 py-7 bg-primary hover:bg-primary/80 neon-border">
              <Plus className="mr-2 h-6 w-6" /> CREATE GAME
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Game Info */}
            <Card className="glass-card">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground font-body">Game Code</p>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-3xl font-bold text-primary tracking-[0.5em]">{game.join_code}</span>
                    <Button variant="ghost" size="icon" onClick={copyCode}><Copy className="h-4 w-4 text-muted-foreground" /></Button>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground font-body">Status</p>
                  <p className="font-display text-lg text-primary uppercase tracking-wider">{statusLabel(game.status)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground font-body">Current Round</p>
                  <p className="font-display text-lg text-foreground">{game.current_round > 0 ? `Round ${game.current_round} — ${ROUND_NAMES[game.current_round]}` : "Not started"}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground font-body">Teams</p>
                  <p className="font-display text-2xl text-primary neon-text">{teams.length}</p>
                  <p className="text-xs text-muted-foreground font-body">{teams.reduce((acc, t) => acc + t.members.length, 0)} members</p>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card className="glass-card">
              <CardContent className="p-6 flex flex-wrap gap-3 justify-center">
                {game.status === "waiting" && (
                  <Button onClick={() => startRound(1)} className="font-display bg-primary hover:bg-primary/80 neon-border"><Play className="mr-2 h-4 w-4" /> START ROUND 1</Button>
                )}
                {["round1", "round2", "round3", "round4"].includes(game.status) && (
                  <Button onClick={endRound} className="font-display bg-primary hover:bg-primary/80">
                    <Pause className="mr-2 h-4 w-4" /> END ROUND {game.current_round}
                  </Button>
                )}
                {game.status === "between_rounds" && game.current_round < 4 && (
                  <Button onClick={() => startRound(game.current_round + 1)} className="font-display bg-primary hover:bg-primary/80 neon-border">
                    <SkipForward className="mr-2 h-4 w-4" /> START ROUND {game.current_round + 1}
                  </Button>
                )}
                {game.status === "between_rounds" && game.current_round === 4 && (
                  <Button onClick={finishGame} className="font-display bg-primary hover:bg-primary/80 neon-border"><Trophy className="mr-2 h-4 w-4" /> FINISH GAME</Button>
                )}
                {game.status === "finished" && (
                  <Button onClick={() => { setGame(null); setTeams([]); }} className="font-display bg-primary hover:bg-primary/80 neon-border"><Plus className="mr-2 h-4 w-4" /> CREATE NEW GAME</Button>
                )}
              </CardContent>
            </Card>

            {/* Question Manager */}
            <QuestionManager gameId={game.id} />

            {/* Teams */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id} className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-lg tracking-wider text-primary flex items-center justify-between">
                      <span className="flex items-center gap-2"><Users className="h-4 w-4" /> {team.name}</span>
                      <div className="text-right">
                        <span className="text-foreground text-sm block font-bold">{team.total_score} pts</span>
                        <div className="flex gap-1.5 justify-end mt-0.5">
                          {[1, 2, 3, 4].map(r => (
                            <span key={r} className="text-muted-foreground text-[10px] font-body">R{r}: {team.round_scores[r] ?? "-"}</span>
                          ))}
                        </div>
                        <span className="text-muted-foreground text-xs block">⏱ {team.total_time}s</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {team.members.map(m => (
                      <div key={m.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${m.is_eliminated ? "bg-destructive/10 line-through opacity-50" : "bg-secondary/50"}`}>
                        <span className="font-body text-sm">{m.name}</span>
                        {m.is_eliminated && <span className="flex items-center gap-1 text-xs text-destructive font-display"><Skull className="h-3 w-3" /> R{m.eliminated_round}</span>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
