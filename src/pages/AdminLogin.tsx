import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Shield, ArrowLeft } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin/login` },
      });
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "Confirm your account to continue." });
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        // Ensure admin role exists
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!existingRole) {
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
        }
        navigate("/admin/dashboard");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen arena-bg flex items-center justify-center px-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="glass-card">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle className="font-display text-2xl tracking-wider text-primary">
              {isSignUp ? "CREATE ACCOUNT" : "ADMIN LOGIN"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-primary/20 font-body text-lg"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary border-primary/20 font-body text-lg"
              />
              <Button
                type="submit"
                className="w-full font-display tracking-wider text-lg py-5 bg-primary hover:bg-primary/80 neon-border"
                disabled={loading}
              >
                {loading ? "..." : isSignUp ? "SIGN UP" : "LOGIN"}
              </Button>
              <p className="text-center text-sm text-muted-foreground font-body">
                {isSignUp ? "Already have an account?" : "No account yet?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline"
                >
                  {isSignUp ? "Login" : "Sign Up"}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
