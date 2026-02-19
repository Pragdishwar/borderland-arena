import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Skull, Users, RotateCcw } from "lucide-react";

type TeamResult = {
  id: string;
  name: string;
  total_score: number;
  total_time: number;
  round_scores: Record<number, number>;
  members: { id: string; name: string; is_eliminated: boolean }[];
};

const GameResults = () => {
  const navigate = useNavigate();
  const gameId = localStorage.getItem("game_id");
  const teamId = localStorage.getItem("team_id");
  const [teams, setTeams] = useState<TeamResult[]>([]);

  useEffect(() => {
    if (!gameId) { navigate("/"); return; }

    const fetchResults = async () => {
      const { data: teamsData } = await supabase.from("teams").select("id, name, total_score").eq("game_id", gameId).order("total_score", { ascending: false });
      if (!teamsData) return;

      const results: TeamResult[] = await Promise.all(
        teamsData.map(async (t) => {
          const { data: mems } = await supabase.from("members").select("id, name, is_eliminated").eq("team_id", t.id);
          const { data: scores } = await supabase.from("round_scores").select("round_number, score, answer_time_seconds").eq("team_id", t.id).eq("game_id", gameId!);
          const totalTime = scores?.reduce((acc, s) => acc + (s.answer_time_seconds || 0), 0) || 0;
          const roundScores: Record<number, number> = {};
          scores?.forEach((s) => { roundScores[s.round_number] = s.score; });
          return { ...t, total_time: totalTime, round_scores: roundScores, members: mems || [] };
        })
      );
      // Sort by score desc, then by time asc (faster wins tiebreaker)
      results.sort((a, b) => b.total_score - a.total_score || a.total_time - b.total_time);
      setTeams(results);
    };
    fetchResults();
  }, [gameId, navigate]);

  const myTeam = teams.find((t) => t.id === teamId);
  const myRank = teams.findIndex((t) => t.id === teamId) + 1;

  const restart = () => {
    localStorage.removeItem("game_id");
    localStorage.removeItem("team_id");
    localStorage.removeItem("join_code");
    navigate("/");
  };

  return (
    <div className="min-h-screen arena-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Trophy className="h-16 w-16 text-primary mx-auto mb-4 animate-float" />
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-wider text-primary neon-text">
            GAME OVER
          </h1>
          {myTeam && (
            <p className="font-body text-xl text-muted-foreground mt-4">
              {myRank === 1 ? "🏆 YOUR TEAM WON!" : `Your team placed #${myRank}`}
            </p>
          )}
        </motion.div>

        {/* Leaderboard */}
        <div className="space-y-4">
          {teams.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`glass-card ${team.id === teamId ? "border-primary/50" : ""}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`font-display text-2xl font-bold ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                      #{i + 1}
                    </span>
                    <div>
                      <p className="font-display tracking-wider text-foreground">{team.name}</p>
                      <div className="flex gap-2 mt-1">
                        {team.members.map((m) => (
                          <span key={m.id} className={`text-xs font-body ${m.is_eliminated ? "text-destructive line-through" : "text-muted-foreground"}`}>
                            {m.is_eliminated && <Skull className="inline h-3 w-3 mr-0.5" />}
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-2xl font-bold text-primary">{team.total_score}</span>
                    <div className="flex gap-1.5 justify-end mt-0.5">
                      {[1, 2, 3].map((r) => (
                        <span key={r} className="text-muted-foreground text-[10px] font-body">
                          R{r}: {team.round_scores[r] ?? "-"}
                        </span>
                      ))}
                    </div>
                    <span className="block text-xs text-muted-foreground font-body">⏱ {team.total_time}s</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button onClick={restart} size="lg" className="font-display tracking-wider bg-primary hover:bg-primary/80 neon-border">
            <RotateCcw className="mr-2 h-5 w-5" /> PLAY AGAIN
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameResults;
