import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Scroll, Plus, CheckCircle2, Clock } from "lucide-react";
import CreateQuestDialog from "./CreateQuestDialog";

interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  status: string;
  deadline: string | null;
  is_auto_generated: boolean;
  created_at: string;
}

interface QuestListProps {
  groupId: string;
  userId: string;
  userRole: string;
}

const QuestList = ({ groupId, userId, userRole }: QuestListProps) => {
  const { toast } = useToast();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchQuests();

    const channel = supabase
      .channel(`quests-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quests",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchQuests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const fetchQuests = async () => {
    try {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .eq("group_id", groupId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuests(data || []);
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-accent/20 text-accent";
      case "medium":
        return "bg-secondary/20 text-secondary";
      case "hard":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scroll className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Active Quests</h2>
        </div>
        {userRole === "quest_master" && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quest
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading quests...</p>
      ) : quests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No active quests. Quest Master can create new quests!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quests.map((quest) => (
            <Card key={quest.id} className="hover:shadow-magical transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{quest.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{quest.description}</CardDescription>
                  </div>
                  {quest.is_auto_generated && (
                    <Badge variant="outline" className="text-xs">
                      Auto
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={getDifficultyColor(quest.difficulty)}>
                    {quest.difficulty}
                  </Badge>
                  <div className="flex items-center gap-1 text-secondary font-semibold">
                    <span>{quest.points}</span>
                    <span className="text-xs">QP</span>
                  </div>
                </div>
                {quest.deadline && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Due: {new Date(quest.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <Button className="w-full" variant="outline">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit Proof
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <CreateQuestDialog
          groupId={groupId}
          userId={userId}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      )}
    </div>
  );
};

export default QuestList;
