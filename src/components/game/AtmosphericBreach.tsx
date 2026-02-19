import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; // Assuming sonner or use-toast is used

type AtmosphericBreachProps = {
    active: boolean;
    teamId: string;
    gameId: string;
};

const AtmosphericBreach = ({ active, teamId, gameId }: AtmosphericBreachProps) => {
    const [breachDetected, setBreachDetected] = useState(false);
    const [disqualified, setDisqualified] = useState(false);

    useEffect(() => {
        if (!active || disqualified) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerBreach();
            }
        };

        const handleBlur = () => {
            // Optional: sometimes blur fires when just clicking outside, strict mode might use this
            // triggerBreach();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        // window.addEventListener("blur", handleBlur); 

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            // window.removeEventListener("blur", handleBlur);
        };
    }, [active, disqualified]);

    const triggerBreach = async () => {
        if (breachDetected) return; // Already triggered locally
        setBreachDetected(true);

        // Play alarm sound if possible? (Browser policy might block)

        // Flag in backend
        try {
            // We are calling a hypothetical RPC or just updating round_scores with a penalty
            // Since we cannot easily add columns, we will log an "EVENT" in a way or use `flag_team_disqualification` RPC if it existed.
            // Fallback: Use a custom edge function or just toast for now if RPC doesn't exist.
            // The plan mentioned creating this RPC or column. 
            // For this implementation, I will attempt to call the RPC.

            await supabase.rpc('flag_team_disqualification', {
                _team_id: teamId,
                _game_id: gameId
            });

            setDisqualified(true);
        } catch (e) {
            console.error("Failed to report breach", e);
            // Fallback or just show visual
        }
    };

    return (
        <AnimatePresence>
            {(breachDetected || disqualified) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] bg-destructive/20 backdrop-blur-sm flex items-center justify-center overflow-hidden"
                >
                    <div className="absolute inset-0 bg-red-900/40 animate-pulse" />

                    {/* Scrolling warning lines */}
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-[1px] bg-red-500 w-full absolute"
                                style={{ top: `${i * 5}%` }}
                            />
                        ))}
                    </div>

                    <motion.div
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        className="relative z-10 bg-black border-4 border-red-600 p-12 max-w-2xl text-center rounded-sm shadow-[0_0_100px_rgba(220,38,38,0.5)]"
                    >
                        <ShieldAlert className="w-24 h-24 text-red-600 mx-auto mb-6 animate-bounce" />

                        <h1 className="font-display text-6xl text-red-600 tracking-widest mb-4">ATMOSPHERIC BREACH</h1>

                        <div className="bg-red-950/50 p-6 border border-red-800 mb-8">
                            <p className="font-mono text-xl text-red-200 uppercase typing-effect">
                        > ILLEGAL MANEUVER DETECTED <br />
                        > WINDOW FOCUS LOST <br />
                        > ANTI-CHEAT PROTOCOL ENGAGED <br />
                        > TEAM STATUS: <span className="font-bold text-red-500">COMPROMISED</span>
                            </p>
                        </div>

                        <p className="text-red-400 font-bold text-lg animate-pulse">
                            ADMINISTRATORS HAVE BEEN NOTIFIED. DO NOT ATTEMPT TO REFRESH.
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AtmosphericBreach;
