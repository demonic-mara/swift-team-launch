import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Trophy, Scroll, Users } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  quest_points: number;
}

interface GroupMembership {
  groups: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

const Profile = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [completedQuests, setCompletedQuests] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, id]);

  const fetchProfile = async () => {
    const profileId = id || user!.id;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: groupsData } = await supabase
        .from("group_members")
        .select("groups(id, name, avatar_url)")
        .eq("user_id", profileId);

      setGroups(groupsData || []);

      const { count } = await supabase
        .from("quest_submissions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profileId)
        .eq("status", "completed");

      setCompletedQuests(count || 0);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading adventurer...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Adventurer not found</p>
      </div>
    );
  }

  const xpForNextLevel = profile.level * 100;
  const currentLevelXP = profile.quest_points % 100;
  const xpProgress = (currentLevelXP / xpForNextLevel) * 100;
  const isOwnProfile = !id || id === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {isOwnProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/edit-profile")}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <Card className="border-2 border-primary/20 shadow-magical animate-fade-in">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <Avatar className="h-32 w-32 border-4 border-primary/30">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="text-4xl bg-gradient-primary text-primary-foreground">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{profile.username}</h1>
                  {profile.bio && (
                    <p className="text-muted-foreground">{profile.bio}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Level {profile.level}</span>
                    <span className="text-sm text-muted-foreground">
                      {currentLevelXP}/{xpForNextLevel} XP
                    </span>
                  </div>
                  <Progress value={xpProgress} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-6 w-6 mx-auto mb-2 text-secondary" />
                      <p className="text-2xl font-bold">{profile.quest_points}</p>
                      <p className="text-xs text-muted-foreground">Quest Points</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Scroll className="h-6 w-6 mx-auto mb-2 text-accent" />
                      <p className="text-2xl font-bold">{completedQuests}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{groups.length}</p>
                      <p className="text-xs text-muted-foreground">Guilds</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Guild Memberships
            </h2>
            {groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((membership) => (
                  <Card
                    key={membership.groups.id}
                    className="cursor-pointer hover-scale"
                    onClick={() => navigate(`/group/${membership.groups.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={membership.groups.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                          {membership.groups.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{membership.groups.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Not a member of any guilds yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
