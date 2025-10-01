import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Menu, Users, Trophy, Scroll, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

interface Profile {
  username: string;
  avatar_url: string | null;
  level: number;
}

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, level")
      .eq("id", session.user.id)
      .single();

    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "See you next time, adventurer!",
    });
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1
              className="text-2xl font-bold cursor-pointer bg-gradient-primary bg-clip-text text-transparent"
              onClick={() => navigate("/groups")}
            >
              QuestRealms
            </h1>

            <nav className="hidden md:flex items-center gap-4">
              <Button
                variant={isActive("/groups") ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate("/groups")}
              >
                <Users className="h-4 w-4 mr-2" />
                Guilds
              </Button>
              <Button
                variant={isActive("/leaderboard") ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate("/leaderboard")}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </Button>
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                    {profile?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline font-medium">
                  {profile?.username || "Adventurer"}
                </span>
                {profile && (
                  <span className="hidden md:inline text-xs text-muted-foreground">
                    Lv. {profile.level}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/groups")}
                className="md:hidden"
              >
                <Users className="h-4 w-4 mr-2" />
                Guilds
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/leaderboard")}
                className="md:hidden"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </DropdownMenuItem>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
