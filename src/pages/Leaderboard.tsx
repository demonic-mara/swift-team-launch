import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Crown, Medal, Star, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  quest_points: number;
  rank: number;
}

interface Group {
  id: string;
  name: string;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [globalLeaders, setGlobalLeaders] = useState<LeaderboardEntry[]>([]);
  const [guildLeaders, setGuildLeaders] = useState<LeaderboardEntry[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    fetchUserGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGuildLeaderboard(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, level, quest_points")
        .order("quest_points", { ascending: false })
        .limit(100);

      if (error) throw error;

      const rankedData = data.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      setGlobalLeaders(rankedData);
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

  const fetchUserGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name)")
        .eq("user_id", user.id);

      if (error) throw error;

      const groups = data
        .filter((item) => item.groups)
        .map((item) => ({
          id: item.groups.id,
          name: item.groups.name,
        }));

      setUserGroups(groups);
      if (groups.length > 0) {
        setSelectedGroupId(groups[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchGuildLeaderboard = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id, profiles(id, username, avatar_url, level, quest_points)")
        .eq("group_id", groupId);

      if (error) throw error;

      const members = data
        .filter((item) => item.profiles)
        .map((item) => item.profiles)
        .sort((a, b) => b.quest_points - a.quest_points);

      const rankedData = members.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      setGuildLeaders(rankedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-secondary" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-muted-foreground" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-accent" />;
    return <Star className="h-6 w-6 text-muted" />;
  };

  const getRankBadgeVariant = (rank: number) => {
    if (rank === 1) return "default";
    if (rank <= 3) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </div>
    );
  }

  const topThree = globalLeaders.slice(0, 3);
  const rest = globalLeaders.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto p-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-secondary" />
            Leaderboard
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="global" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="groups">My Guilds</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-6">
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {topThree.map((leader) => (
                  <Card
                    key={leader.id}
                    className="cursor-pointer hover-scale border-2 border-primary/20 shadow-magical animate-scale-in"
                    onClick={() => navigate(`/profile/${leader.id}`)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="flex justify-center mb-4">
                        {getRankIcon(leader.rank)}
                      </div>
                      <Avatar className="h-20 w-20 mx-auto mb-4 border-4 border-primary/30">
                        <AvatarImage src={leader.avatar_url || ""} />
                        <AvatarFallback className="text-2xl bg-gradient-primary text-primary-foreground">
                          {leader.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-bold text-lg mb-2">{leader.username}</h3>
                      <Badge variant={getRankBadgeVariant(leader.rank)} className="mb-2">
                        Rank #{leader.rank}
                      </Badge>
                      <div className="flex items-center justify-center gap-4 text-sm mt-4">
                        <div>
                          <p className="text-muted-foreground">Level</p>
                          <p className="font-bold">{leader.level}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">QP</p>
                          <p className="font-bold">{leader.quest_points}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {rest.map((leader, index) => (
                <Card
                  key={leader.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => navigate(`/profile/${leader.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 text-center">
                        <span className="text-2xl font-bold text-muted-foreground">
                          {leader.rank}
                        </span>
                      </div>
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={leader.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                          {leader.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{leader.username}</p>
                        <p className="text-sm text-muted-foreground">Level {leader.level}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{leader.quest_points}</p>
                        <p className="text-xs text-muted-foreground">Quest Points</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            {userGroups.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    You haven't joined any guilds yet!
                  </p>
                  <button
                    onClick={() => navigate("/groups")}
                    className="text-primary hover:underline"
                  >
                    Browse Guilds
                  </button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="max-w-md mx-auto">
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a guild" />
                    </SelectTrigger>
                    <SelectContent>
                      {userGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {guildLeaders.length > 0 && (
                  <>
                    {guildLeaders.slice(0, 3).length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {guildLeaders.slice(0, 3).map((leader) => (
                          <Card
                            key={leader.id}
                            className="cursor-pointer hover-scale border-2 border-primary/20 shadow-magical animate-scale-in"
                            onClick={() => navigate(`/profile/${leader.id}`)}
                          >
                            <CardContent className="p-6 text-center">
                              <div className="flex justify-center mb-4">
                                {getRankIcon(leader.rank)}
                              </div>
                              <Avatar className="h-20 w-20 mx-auto mb-4 border-4 border-primary/30">
                                <AvatarImage src={leader.avatar_url || ""} />
                                <AvatarFallback className="text-2xl bg-gradient-primary text-primary-foreground">
                                  {leader.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <h3 className="font-bold text-lg mb-2">{leader.username}</h3>
                              <Badge variant={getRankBadgeVariant(leader.rank)} className="mb-2">
                                Rank #{leader.rank}
                              </Badge>
                              <div className="flex items-center justify-center gap-4 text-sm mt-4">
                                <div>
                                  <p className="text-muted-foreground">Level</p>
                                  <p className="font-bold">{leader.level}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">QP</p>
                                  <p className="font-bold">{leader.quest_points}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      {guildLeaders.slice(3).map((leader, index) => (
                        <Card
                          key={leader.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors animate-fade-in"
                          style={{ animationDelay: `${index * 0.05}s` }}
                          onClick={() => navigate(`/profile/${leader.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 text-center">
                                <span className="text-2xl font-bold text-muted-foreground">
                                  {leader.rank}
                                </span>
                              </div>
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={leader.avatar_url || ""} />
                                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                                  {leader.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-semibold">{leader.username}</p>
                                <p className="text-sm text-muted-foreground">Level {leader.level}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{leader.quest_points}</p>
                                <p className="text-xs text-muted-foreground">Quest Points</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
