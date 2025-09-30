import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Users, Plus, LogOut } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";

interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  member_limit: number;
  category: string | null;
}

interface GroupWithMemberCount extends Group {
  member_count: number;
}

const Groups = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [myGroups, setMyGroups] = useState<GroupWithMemberCount[]>([]);
  const [allGroups, setAllGroups] = useState<GroupWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id);

      if (memberError) throw memberError;

      const myGroupIds = memberData?.map(m => m.group_id) || [];

      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*");

      if (groupsError) throw groupsError;

      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          return {
            ...group,
            member_count: count || 0,
          };
        })
      );

      setMyGroups(groupsWithCounts.filter(g => myGroupIds.includes(g.id)));
      setAllGroups(groupsWithCounts.filter(g => !myGroupIds.includes(g.id)));
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: user!.id,
        });

      if (error) throw error;

      toast({
        title: "Joined group!",
        description: "You have successfully joined the group.",
      });

      fetchGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your guilds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              QuestRealms
            </h1>
            <p className="text-muted-foreground mt-2">Join guilds and embark on adventures</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/create-group")} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Guild
            </Button>
            <Button onClick={handleLogout} variant="outline" size="lg">
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            My Guilds
          </h2>
          {myGroups.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">You haven't joined any guilds yet. Discover guilds below!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer hover:shadow-magical transition-shadow"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {group.member_count}/{group.member_limit} members
                      </span>
                      {group.category && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {group.category}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Discover Guilds</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allGroups.map((group) => (
              <Card key={group.id} className="hover:shadow-magical transition-shadow">
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-muted-foreground">
                      {group.member_count}/{group.member_limit} members
                    </span>
                    {group.category && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {group.category}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => joinGroup(group.id)}
                    className="w-full"
                    disabled={group.member_count >= group.member_limit}
                  >
                    {group.member_count >= group.member_limit ? "Full" : "Join Guild"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Groups;
