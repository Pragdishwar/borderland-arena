import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import { Play, Pause, SkipForward, Plus, Users, Skull, Trophy, Copy, LogOut, Trash2 } from "lucide-react";
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
  is_disqualified: boolean;
  ban_count: number;
};

const ROUND_NAMES: Record<number, string> = { 1: "Entry Game", 2: "Mind Trap", 3: "Betrayal Stage", 4: "Final Showdown" };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gamesList, setGamesList] = useState<Game[]>([]);

  const fetchGames = async () => {
    const { data: games } = await supabase
      .from("games")
      .select("*")
      .neq("status", "finished")
      .order("created_at", { ascending: false });

    if (games && games.length > 0) {
      setGamesList(games);
    }
    return games;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      setUser(user);

      // Fetch the latest active games
      const games = await fetchGames();
      if (games && games?.length > 0) {
        setGame(games[0]);
        await fetchTeams(games[0].id);
      }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!game) return;
    const channel = supabase.channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` }, (payload) => { if (payload.new) setGame(payload.new as Game); })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${game.id}` }, () => { fetchTeams(game.id); })
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => { fetchTeams(game.id); })
      .on("postgres_changes", { event: "*", schema: "public", table: "round_scores", filter: `game_id=eq.${game.id}` }, () => { fetchTeams(game.id); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [game?.id]);

  const fetchTeams = async (gameId: string) => {
    const { data: teamsData, error: parseError } = await supabase.from("teams").select("id, name, total_score, is_disqualified, ban_count").eq("game_id", gameId);
    if (parseError) {
      console.error("Teams fetch error:", parseError);
      toast({ title: "Database Error", description: parseError.message, variant: "destructive" });
      return;
    }
    if (!teamsData) return;
    const teamsWithMembers: Team[] = await Promise.all(
      teamsData.map(async (t) => {
        const { data: mems, error: memError } = await supabase.from("members").select("id, name, is_eliminated, eliminated_round").eq("team_id", t.id);
        const { data: scores, error: scoreError } = await supabase.from("round_scores").select("round_number, score, answer_time_seconds").eq("team_id", t.id).eq("game_id", gameId);

        if (memError) console.error("Member fetch error:", memError);
        if (scoreError) console.error("Score fetch error:", scoreError);
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
    setLoading(true);
    const code = generateCode();
    const { data, error } = await supabase.from("games").insert({ admin_id: user.id, join_code: code, name: "Borderland Arena" }).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    await fetchGames();
    setGame(data);
    toast({ title: "Game created!", description: `Code: ${code}` });
    setLoading(false);
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

  const deleteGame = async () => {
    if (!game) return;
    if (!window.confirm("Are you sure you want to PERMANENTLY delete this game lobby, its teams, and all score data? This cannot be undone.")) return;
    setLoading(true);
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    if (error) {
      toast({ title: "Deletion Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lobby Deleted", description: "All database records have been securely erased." });
      setGame(null);
      setTeams([]);
      await fetchGames();
    }
    setLoading(false);
  };

  const copyCode = () => {
    if (game) { navigator.clipboard.writeText(game.join_code); toast({ title: "Copied!" }); }
  };

  const unbanTeam = async (teamId: string) => {
    const { error } = await supabase.from('teams').update({ is_disqualified: false }).eq('id', teamId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team Unbanned", description: "The atmospheric breach lockout has been removed." });
    }
  };

  const banTeam = async (teamId: string) => {
    const { error } = await supabase.rpc('trigger_atmospheric_breach', { _team_id: teamId });
    if (error) {
      toast({ title: "Error tracking violation", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Violation Logged", description: "Team has been struck and disabled." });
    }
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

  if (loading) {
    return (
      <div className="min-h-screen arena-bg p-4 md:p-8 flex items-center justify-center">
        <div className="text-primary animate-pulse font-display text-xl tracking-widest">LOADING SYSTEM...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen arena-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wider text-primary neon-text">ADMIN DASHBOARD</h1>
            {gamesList.length > 1 && (
              <select
                title="Select Game Lobby"
                className="bg-black/80 border border-primary/50 text-white font-mono text-sm px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]"
                value={game?.id || ""}
                onChange={(e) => {
                  const selected = gamesList.find(g => g.id === e.target.value);
                  if (selected) {
                    setGame(selected);
                    fetchTeams(selected.id);
                  }
                }}
              >
                {gamesList.map(g => (
                  <option key={g.id} value={g.id} className="bg-black text-white">Lobby: {g.join_code} ({g.status})</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-4">
            <Button onClick={createGame} className="bg-primary hover:bg-primary/80 font-display neon-border text-black">
              <Plus className="mr-2 h-4 w-4" /> NEW LOBBY
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              Home
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        {!game ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 glass-card rounded-xl">
            <h2 className="font-display text-2xl text-primary mb-4">NO ACTIVE LOBBY SELECTED</h2>
            <p className="text-muted-foreground font-body mb-8">Select an existing game from the dropdown or construct a new instance.</p>
            <Button size="lg" onClick={createGame} className="font-display text-xl px-10 py-7 bg-primary hover:bg-primary/80 neon-border text-black">
              <Plus className="mr-2 h-6 w-6" /> INITIALIZE NEW GAME
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
                  <Button onClick={() => { setGame(null); setTeams([]); }} className="font-display bg-primary hover:bg-primary/80 neon-border text-black"><Plus className="mr-2 h-4 w-4" /> CREATE NEW GAME</Button>
                )}
                {/* Global Delete Button */}
                <Button onClick={deleteGame} variant="destructive" className="font-display neon-border shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                  <Trash2 className="mr-2 h-4 w-4" /> DELETE LOBBY
                </Button>
              </CardContent>
            </Card>

            {/* Question Manager */}
            <QuestionManager gameId={game.id} />

            {/* Teams */}
            <div className="space-y-4">
              {teams.length === 0 ? (
                <Card className="glass-card border-dashed border-primary/20">
                  <CardContent className="p-8 text-center text-muted-foreground font-body">
                    No teams have joined this lobby yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <Card key={team.id} className={`glass-card ${team.is_disqualified ? 'border-destructive/50 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : ''}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-lg tracking-wider text-primary flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className={`flex items-center gap-2 ${team.is_disqualified ? 'text-destructive' : ''}`}>
                              <Users className="h-4 w-4" /> {team.name}
                            </span>
                            {team.ban_count > 0 && (
                              <span className="text-[10px] text-destructive/80 font-mono mt-0.5 font-bold tracking-wider">
                                WARNINGS: {team.ban_count}
                              </span>
                            )}
                            {team.is_disqualified ? (
                              <div className="flex flex-col items-start gap-2 mt-2">
                                <span className="text-xs text-destructive flex items-center font-mono uppercase tracking-widest"><Skull className="h-3 w-3 mr-1" /> Disqualified (Cheat Flag)</span>
                                <Button size="sm" variant="outline" onClick={() => unbanTeam(team.id)} className="h-6 text-[10px] pb-5 pt-5 neon-border border-destructive text-destructive hover:bg-destructive hover:text-white font-display">REMOVE FLAG</Button>
                              </div>
                            ) : (
                              <div className="mt-2">
                                <Button size="sm" variant="outline" onClick={() => banTeam(team.id)} className="h-6 text-[10px] pb-4 pt-4 border-destructive/50 text-destructive hover:bg-destructive hover:text-white font-display">STRIKE TEAM (+1)</Button>
                              </div>
                            )}
                          </div>
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
