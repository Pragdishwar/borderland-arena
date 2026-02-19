import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Swords, Timer, Skull, Trophy, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        await checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session) {
      await checkAdminRole(session.user.id);
    }
    setCheckingAuth(false);
  };

  const checkAdminRole = async (userId: string) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!roleData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim()) {
      toast({ title: "Enter a game code", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("games")
      .select("id, status")
      .eq("join_code", joinCode.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Invalid game code", description: "No game found with that code.", variant: "destructive" });
      setLoading(false);
      return;
    }

    localStorage.setItem("game_id", data.id);
    localStorage.setItem("join_code", joinCode.trim().toUpperCase());
    navigate("/team-setup");
    setLoading(false);
  };

  const rules = [
    { icon: Users, title: "Form Your Team", desc: "5-6 members per team" },
    { icon: Swords, title: "Choose Your Card", desc: "♠ ♥ ♦ ♣ — each a different challenge" },
    { icon: Timer, title: "Beat the Clock", desc: "5 / 10 / 15 min per round" },
    { icon: Skull, title: "Survive Elimination", desc: "Low scores lose team members" },
    { icon: Trophy, title: "Last Team Standing", desc: "Highest score wins the arena" },
  ];

  return (
    <div className="min-h-screen arena-bg relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-wider neon-text text-primary mb-4">
            BORDERLAND
          </h1>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-widest text-foreground/90 mb-6">
            ARENA
          </h1>
          <p className="text-xl md:text-2xl font-body font-light text-muted-foreground tracking-[0.3em] uppercase">
            Survival Tech Challenge
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          {!checkingAuth && (
            <>
              {isAuthenticated ? (
                isAdmin ? (
                  <Button
                    size="lg"
                    onClick={() => navigate("/admin/dashboard")}
                    className="text-lg px-8 py-6 font-display tracking-wider bg-primary hover:bg-primary/80 neon-border"
                  >
                    <Shield className="mr-2 h-5 w-5" />
                    ADMIN DASHBOARD
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleLogout}
                    variant="outline"
                    className="text-lg px-8 py-6 font-display tracking-wider border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    SIGN OUT
                  </Button>
                )
              ) : (
                <Button
                  size="lg"
                  onClick={() => navigate("/admin/login")}
                  className="text-lg px-8 py-6 font-display tracking-wider bg-primary hover:bg-primary/80 neon-border"
                >
                  <Shield className="mr-2 h-5 w-5" />
                  LOGIN
                </Button>
              )}
            </>
          )}

          {!showJoin ? (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowJoin(true)}
              className="text-lg px-8 py-6 font-display tracking-wider border-primary/40 text-primary hover:bg-primary/10"
            >
              <Users className="mr-2 h-5 w-5" />
              JOIN AS TEAM
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="ENTER GAME CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="text-lg font-display tracking-widest text-center bg-secondary border-primary/30 placeholder:text-muted-foreground/50 w-48"
                maxLength={6}
                onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
              />
              <Button
                size="lg"
                onClick={handleJoinGame}
                disabled={loading}
                className="font-display bg-primary hover:bg-primary/80"
              >
                JOIN
              </Button>
            </div>
          )}
        </motion.div>

        {/* Rules */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="w-full max-w-4xl"
        >
          <h2 className="text-center text-2xl font-display font-bold text-primary/80 mb-8 tracking-wider">
            HOW TO SURVIVE
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {rules.map((rule, i) => (
              <motion.div
                key={rule.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              >
                <Card className="glass-card h-full text-center p-4 hover:border-primary/40 transition-all duration-300">
                  <CardContent className="p-0 flex flex-col items-center gap-3">
                    <rule.icon className="h-8 w-8 text-primary animate-pulse-glow" />
                    <h3 className="font-display text-sm font-bold tracking-wider text-foreground">
                      {rule.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body">
                      {rule.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
