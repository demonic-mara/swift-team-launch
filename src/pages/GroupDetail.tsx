import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Scroll, MessageCircle, Crown } from "lucide-react";
import { User } from "@supabase/supabase-js";
import ChatRoom from "@/components/ChatRoom";
import QuestList from "@/components/QuestList";
import AppHeader from "@/components/AppHeader";

interface Group {
  id: string;
  name: string;
  description: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    username: string;
    level: number;
    quest_points: number;
  };
}

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user && id) {
      fetchGroupData();
    }
  }, [user, id]);

  const fetchGroupData = async () => {
    if (!id) return;

    try {
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);
      setIsFounder(groupData.created_by === user!.id);

      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select(`
          *,
          profiles (
            username,
            level,
            quest_points
          )
        `)
        .eq("group_id", id);

      if (memberError) throw memberError;
      setMembers(memberData || []);

      const userMember = memberData?.find(m => m.user_id === user!.id);
      setUserRole(userMember?.role || "");
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
        <p className="text-muted-foreground">Loading guild...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Guild not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <AppHeader />
      
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/groups")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{group.name}</h1>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{members.length} members</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Normal Chat
            </TabsTrigger>
            <TabsTrigger value="quests" className="flex items-center gap-2">
              <Scroll className="h-4 w-4" />
              Quest Chat
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <ChatRoom groupId={id!} userId={user!.id} chatroomType="normal" />
          </TabsContent>

          <TabsContent value="quests" className="space-y-4">
            <QuestList groupId={id!} userId={user!.id} userRole={userRole} isFounder={isFounder} />
            <ChatRoom groupId={id!} userId={user!.id} chatroomType="quest" />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{member.profiles.username}</h3>
                      {member.role === "quest_master" && (
                        <Crown className="h-4 w-4 text-secondary" />
                      )}
                      {member.role === "admin" && (
                        <Crown className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Level {member.profiles.level}</span>
                      <span>{member.profiles.quest_points} QP</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GroupDetail;
