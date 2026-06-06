import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, session } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (session) {
    navigate("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error, variant: "destructive" });
    } else {
      navigate("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <img src="/logo.png" alt="Arpit Thrift" className="h-16 w-auto mx-auto mb-6" style={{ filter: "invert(1) brightness(2)" }} />
          <p className="text-white/50 text-sm uppercase tracking-widest">Admin Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/70 text-xs uppercase tracking-wider">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white rounded-none h-12"
              placeholder="admin@arpitthrift.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/70 text-xs uppercase tracking-wider">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white rounded-none h-12"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-white text-black hover:bg-white/90 rounded-none font-bold uppercase tracking-widest text-sm mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
