import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Swords, Timer, Skull, Trophy, LogOut, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [showRejoin, setShowRejoin] = useState(false);
  const [rejoinTeamName, setRejoinTeamName] = useState("");
  const [rejoinCode, setRejoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejoinLoading, setRejoinLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Arena Status States
  const [activeGame, setActiveGame] = useState<any>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [roundElapsed, setRoundElapsed] = useState(0);

  const ROUND_NAMES: Record<number, string> = { 1: "Entry Game", 2: "Execution Trace", 3: "Reverse Compiler", 4: "Code Autopsy" };
  const ROUND_TIMES: Record<number, number> = { 1: 10 * 60, 2: 20 * 60, 3: 30 * 60, 4: 30 * 60 };

  useEffect(() => {
    fetchArenaStatus();

    const channel = supabase.channel("arena-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => fetchArenaStatus())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => fetchArenaStatus())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchArenaStatus = async () => {
    try {
      const { data: games } = await supabase
        .from("games")
        .select("*")
        .neq("status", "finished")
        .order("created_at", { ascending: false });

      if (games && games.length > 0) {
        const game = games[0];
        setActiveGame(game);
        
        const { count } = await supabase
          .from("teams")
          .select("*", { count: "exact", head: true })
          .eq("game_id", game.id);
        
        setTeamCount(count || 0);
      } else {
        setActiveGame(null);
        setTeamCount(0);
      }
    } catch (err) {
      console.error("Fetch arena status error:", err);
    }
  };

  // Live round timer logic
  useEffect(() => {
    if (!activeGame?.round_started_at || !["round1", "round2", "round3", "round4"].includes(activeGame.status)) {
      setRoundElapsed(0);
      return;
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(activeGame.round_started_at!).getTime()) / 1000);
      const paused = activeGame.total_paused_seconds || 0;
      const currentPause = activeGame.is_paused && activeGame.paused_at ? Math.floor((Date.now() - new Date(activeGame.paused_at).getTime()) / 1000) : 0;
      setRoundElapsed(Math.max(0, elapsed - paused - currentPause));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeGame?.round_started_at, activeGame?.status, activeGame?.is_paused, activeGame?.paused_at, activeGame?.total_paused_seconds]);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setIsAuthenticated(!!session);
        if (session) {
          await checkAdminRole(session.user.id);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Auth change error:", err);
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      setIsAuthenticated(!!session);
      if (session) {
        await checkAdminRole(session.user.id);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Check admin role error:", error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(!!roleData);
    } catch (err) {
      console.error("Check admin role exception:", err);
      setIsAdmin(false);
    }
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

  const handleRejoin = async () => {
    if (!rejoinCode.trim() || !rejoinTeamName.trim()) {
      toast({ title: "Enter both game code and team name", variant: "destructive" });
      return;
    }
    setRejoinLoading(true);

    // Look up game by join code
    const { data: game, error: gameErr } = await supabase
      .from("games")
      .select("id, status")
      .eq("join_code", rejoinCode.trim().toUpperCase())
      .maybeSingle();

    if (gameErr || !game) {
      toast({ title: "Invalid game code", description: "No game found with that code.", variant: "destructive" });
      setRejoinLoading(false);
      return;
    }

    // Look up team by name within this game (case-insensitive)
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("id, name")
      .eq("game_id", game.id)
      .ilike("name", rejoinTeamName.trim())
      .maybeSingle();

    if (teamErr || !team) {
      toast({ title: "Team not found", description: "No team with that name in this game.", variant: "destructive" });
      setRejoinLoading(false);
      return;
    }

    // Restore localStorage
    localStorage.setItem("game_id", game.id);
    localStorage.setItem("team_id", team.id);
    localStorage.setItem("join_code", rejoinCode.trim().toUpperCase());

    toast({ title: "Reconnected!", description: `Welcome back, ${team.name}!` });

    // Navigate based on game status
    if (game.status === "waiting") {
      navigate("/game/lobby");
    } else if (game.status === "finished") {
      navigate("/game/results");
    } else {
      navigate("/game/play");
    }
    setRejoinLoading(false);
  };

  const rules = [
    { icon: Users, title: "Form Your Team", desc: "Max 4 members per team" },
    { icon: Swords, title: "Choose Your Card", desc: "♠ ♥ ♦ ♣ — each a different challenge" },
    { icon: Timer, title: "Beat the Clock", desc: "10 / 20 / 30 min per round" },
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

        {/* Live Arena Status Card */}
        {activeGame && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full max-w-4xl mb-12"
          >
            <div 
              className="relative overflow-hidden rounded-2xl border border-primary/20 bg-black/60 backdrop-blur-xl p-6 md:p-8 shadow-[0_0_50px_rgba(var(--primary),0.1)]"
            >
              {/* Scanline effect */}
              <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
              
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
                {/* Lobby Info */}
                <div className="space-y-1">
                  <p className="text-xs font-display tracking-widest text-primary/60 uppercase">ACTIVE ARENA</p>
                  <p className="text-3xl font-display font-bold text-primary tracking-widest neon-text">
                    {activeGame.join_code}
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="font-body text-sm tracking-wide">{teamCount} Teams Registered</span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full animate-pulse ${activeGame.status === 'waiting' ? 'bg-amber-400' : 'bg-destructive'}`} />
                    <p className="font-display text-sm tracking-widest text-foreground uppercase">
                      {activeGame.status === 'waiting' ? 'WAITING FOR TEAMS' : 'ARENA IN PROGRESS'}
                    </p>
                  </div>
                  <p className="text-muted-foreground font-body text-xs text-center">
                    {activeGame.status === 'waiting' 
                      ? 'Lobby is open for new entries.' 
                      : `Engaged in ${ROUND_NAMES[activeGame.current_round] || 'Unknown Round'}`}
                  </p>
                </div>

                {/* Round Details / Timer */}
                <div className="text-center md:text-right space-y-1">
                  {["round1", "round2", "round3", "round4"].includes(activeGame.status) ? (
                    <>
                      <p className="text-xs font-display tracking-widest text-primary/60 uppercase">TIME REMAINING</p>
                      <p className={`text-3xl font-mono font-bold tracking-tighter ${activeGame.is_paused ? 'text-amber-400 animate-pulse' : roundElapsed >= (ROUND_TIMES[activeGame.current_round] || 1800) ? 'text-destructive' : 'text-primary neon-text'}`}>
                        {(() => {
                          const total = ROUND_TIMES[activeGame.current_round] || 1800;
                          const rem = Math.max(0, total - roundElapsed);
                          const m = Math.floor(rem / 60);
                          const s = rem % 60;
                          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        })()}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-display tracking-widest uppercase">
                        {activeGame.is_paused ? 'ORBITAL DECAY PAUSED' : `ROUND ${activeGame.current_round} OF 4`}
                      </p>
                    </>
                  ) : (
                    <div className="h-full flex flex-col justify-center">
                      <p className="text-sm font-display tracking-widest text-primary hover:text-primary/80 transition-colors uppercase cursor-default">
                        Awaiting Signal...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

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

          {!showJoin && !showRejoin ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => { setShowJoin(true); setShowRejoin(false); }}
                className="text-lg px-8 py-6 font-display tracking-wider border-primary/40 text-primary hover:bg-primary/10"
              >
                <Users className="mr-2 h-5 w-5" />
                JOIN AS TEAM
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => { setShowRejoin(true); setShowJoin(false); }}
                className="text-lg px-8 py-6 font-display tracking-wider border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                REJOIN TEAM
              </Button>
            </div>
          ) : showJoin ? (
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
              <Button size="lg" variant="ghost" onClick={() => setShowJoin(false)} className="text-muted-foreground">
                ✕
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 items-center">
              <p className="text-sm text-amber-400 font-display tracking-wider">REJOIN YOUR TEAM</p>
              <div className="flex gap-2">
                <Input
                  placeholder="GAME CODE"
                  value={rejoinCode}
                  onChange={(e) => setRejoinCode(e.target.value.toUpperCase())}
                  className="text-lg font-display tracking-widest text-center bg-secondary border-amber-500/30 placeholder:text-muted-foreground/50 w-36"
                  maxLength={6}
                />
                <Input
                  placeholder="TEAM NAME"
                  value={rejoinTeamName}
                  onChange={(e) => setRejoinTeamName(e.target.value)}
                  className="text-lg font-display tracking-wider text-center bg-secondary border-amber-500/30 placeholder:text-muted-foreground/50 w-48"
                  onKeyDown={(e) => e.key === "Enter" && handleRejoin()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="lg"
                  onClick={handleRejoin}
                  disabled={rejoinLoading}
                  className="font-display bg-amber-500 hover:bg-amber-500/80 text-black"
                >
                  {rejoinLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                  REJOIN
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setShowRejoin(false)} className="text-muted-foreground">
                  ✕
                </Button>
              </div>
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

        {/* Team Members */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="w-full max-w-2xl mt-16"
        >
          <div
            className="relative rounded-xl p-8 text-center"
            style={{
              background: 'linear-gradient(145deg, hsl(0 0% 8%), hsl(0 0% 5%))',
              border: '1px solid hsl(45 100% 50% / 0.3)',
              boxShadow:
                '0 0 20px hsl(45 100% 50% / 0.1), 0 0 60px hsl(45 100% 50% / 0.05), inset 0 0 20px hsl(45 100% 50% / 0.03)',
            }}
          >
            {/* Decorative top line */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-24 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, hsl(45 100% 50% / 0.8), transparent)',
              }}
            />

            <h2
              className="text-xl md:text-2xl font-display font-bold tracking-wider mb-6 flex items-center justify-center gap-3"
              style={{ color: 'hsl(45 100% 65%)' }}
            >
              <Users className="h-6 w-6" style={{ color: 'hsl(45 100% 60%)' }} />
              DEVELOPED BY
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
              {[
                'Pragdishwar',
                'Abinav Kishore',
                'Elango D',
                'Nisha Perumal',
              ].map((name, i, arr) => (
                <span key={name} className="flex items-center">
                  <span
                    className="text-base md:text-lg font-body font-medium tracking-wide px-3 py-1 transition-colors duration-300 hover:text-white cursor-default"
                    style={{ color: 'hsl(0 0% 70%)' }}
                  >
                    {name}
                  </span>
                  {i < arr.length - 1 && (
                    <span
                      className="hidden sm:inline text-lg select-none"
                      style={{ color: 'hsl(45 100% 50% / 0.5)' }}
                    >
                      •
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Decorative bottom line */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-24 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, hsl(45 100% 50% / 0.8), transparent)',
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
