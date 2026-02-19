import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";

const GameLobby = () => {
  const navigate = useNavigate();
  const gameId = localStorage.getItem("game_id");
  const teamId = localStorage.getItem("team_id");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [gameStatus, setGameStatus] = useState("waiting");

  useEffect(() => {
    if (!gameId || !teamId) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      const { data: team } = await supabase.from("teams").select("name").eq("id", teamId).single();
      if (team) setTeamName(team.name);

      const { data: mems } = await supabase.from("members").select("id, name").eq("team_id", teamId);
      if (mems) setMembers(mems);

      const { data: game } = await supabase.from("games").select("status").eq("id", gameId).single();
      if (game) {
        setGameStatus(game.status);
        if (game.status === "round1" || game.status === "round2" || game.status === "round3") {
          navigate("/game/play");
        }
      }
    };

    fetchData();

    // Listen for game status changes
    const channel = supabase
      .channel("lobby-game")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (payload) => {
        const newStatus = payload.new.status;
        setGameStatus(newStatus);
        if (newStatus === "round1" || newStatus === "round2" || newStatus === "round3") {
          navigate("/game/play");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, teamId, navigate]);

  return (
    <div className="min-h-screen arena-bg flex items-center justify-center px-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md text-center relative z-10"
      >
        <Card className="glass-card">
          <CardContent className="p-8 space-y-6">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <h2 className="font-display text-2xl font-bold tracking-wider text-primary">
              WAITING FOR GAME
            </h2>
            <p className="text-muted-foreground font-body text-lg">
              Team <span className="text-primary font-bold">{teamName}</span> is ready
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {members.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-3 rounded-lg text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-body font-semibold truncate">{m.name}</p>
                </motion.div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground animate-pulse-glow font-body">
              The admin will start the game soon...
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default GameLobby;
