import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Scroll, Trophy } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/groups");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utb3BhY2l0eT0iMC4xIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />
      
      <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-primary to-primary-glow">
              <Sparkles className="h-16 w-16 text-primary-foreground" />
            </div>
          </div>
        </div>

        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
          QuestRealms
        </h1>
        <p className="text-2xl text-muted-foreground mb-8">
          Transform everyday activities into epic RPG adventures
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 mt-12">
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border hover:shadow-magical transition-shadow">
            <Users className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Join Guilds</h3>
            <p className="text-sm text-muted-foreground">
              Connect with up to 50 fellow adventurers in guild-based communities
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border hover:shadow-magical transition-shadow">
            <Scroll className="h-8 w-8 text-secondary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Complete Quests</h3>
            <p className="text-sm text-muted-foreground">
              Take on real-world challenges and submit proof for peer validation
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border hover:shadow-magical transition-shadow">
            <Trophy className="h-8 w-8 text-accent mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Level Up</h3>
            <p className="text-sm text-muted-foreground">
              Earn Quest Points, unlock achievements, and climb the leaderboards
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
            Start Your Adventure
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
