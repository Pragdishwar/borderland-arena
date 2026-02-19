import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, X, ArrowLeft, Loader2 } from "lucide-react";

const TeamSetup = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);

  const gameId = localStorage.getItem("game_id");

  const addMember = () => {
    if (members.length < 6) setMembers([...members, ""]);
  };

  const removeMember = (i: number) => {
    if (members.length > 1) setMembers(members.filter((_, idx) => idx !== i));
  };

  const updateMember = (i: number, val: string) => {
    const updated = [...members];
    updated[i] = val;
    setMembers(updated);
  };

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      toast({ title: "Enter a team name", variant: "destructive" });
      return;
    }
    const validMembers = members.filter((m) => m.trim());
    if (validMembers.length < 2) {
      toast({ title: "Add at least 2 members", variant: "destructive" });
      return;
    }
    if (!gameId) {
      toast({ title: "No game found", description: "Go back and enter a game code.", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ game_id: gameId, name: teamName.trim() })
      .select("id")
      .single();

    if (teamError) {
      toast({ title: "Error", description: teamError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const memberRows = validMembers.map((name) => ({ team_id: team.id, name: name.trim() }));
    const { error: memberError } = await supabase.from("members").insert(memberRows);

    if (memberError) {
      toast({ title: "Error adding members", description: memberError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    localStorage.setItem("team_id", team.id);
    navigate("/game/lobby");
    setLoading(false);
  };

  return (
    <div className="min-h-screen arena-bg flex items-center justify-center px-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="glass-card">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Users className="h-10 w-10 text-primary mx-auto mb-2" />
              <h2 className="font-display text-2xl font-bold tracking-wider text-primary">TEAM SETUP</h2>
            </div>

            <Input
              placeholder="TEAM NAME"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="bg-secondary border-primary/20 font-display text-lg tracking-wider text-center"
            />

            <div className="space-y-3">
              <p className="font-display text-sm text-muted-foreground tracking-wider">MEMBERS ({members.length}/6)</p>
              {members.map((member, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder={`Member ${i + 1}`}
                    value={member}
                    onChange={(e) => updateMember(i, e.target.value)}
                    className="bg-secondary border-primary/20 font-body"
                  />
                  {members.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeMember(i)} className="text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
              {members.length < 6 && (
                <Button variant="outline" onClick={addMember} className="w-full border-dashed border-primary/30 text-primary">
                  <Plus className="mr-2 h-4 w-4" /> Add Member
                </Button>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full font-display tracking-wider text-lg py-5 bg-primary hover:bg-primary/80 neon-border"
            >
              {loading ? <Loader2 className="animate-spin" /> : "ENTER THE ARENA"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TeamSetup;
