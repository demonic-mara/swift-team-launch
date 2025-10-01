import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Scroll, Plus, CheckCircle2, Clock, Target } from "lucide-react";
import CreateQuestDialog from "./CreateQuestDialog";
import QuestRatingSystem from "./QuestRatingSystem";

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
  quest_submissions: QuestSubmission[];
}

interface QuestListProps {
  groupId: string;
  userId: string;
  userRole: string;
}

interface QuestSubmission {
  id: string;
  user_id: string;
  proof_text: string | null;
  proof_file_url: string | null;
  proof_file_type: string | null;
  status: string;
  approval_count: number;
  rejection_count: number;
  profiles: {
    username: string;
  };
}

const QuestList = ({ groupId, userId, userRole }: QuestListProps) => {
  const { toast } = useToast();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    fetchQuests();
    fetchMemberCount();

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

  const fetchMemberCount = async () => {
    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);
    
    setTotalMembers(count || 0);
  };

  const fetchQuests = async () => {
    try {
      const { data, error } = await supabase
        .from("quests")
        .select(`
          *,
          quest_submissions(
            id,
            user_id,
            proof_text,
            proof_file_url,
            proof_file_type,
            status,
            approval_count,
            rejection_count,
            profiles(username)
          )
        `)
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

  const getDifficultyVariant = (difficulty: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (difficulty) {
      case "easy":
        return "secondary";
      case "medium":
        return "default";
      case "hard":
        return "destructive";
      default:
        return "outline";
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
        <div className="space-y-4">
          {quests.map((quest) => (
            <Card key={quest.id} className="border-primary/20 shadow-sm animate-fade-in">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      <Scroll className="h-5 w-5 text-primary" />
                      {quest.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={getDifficultyVariant(quest.difficulty)}>
                        {quest.difficulty}
                      </Badge>
                      <Badge variant="secondary">
                        <Target className="h-3 w-3 mr-1" />
                        {quest.points} QP
                      </Badge>
                      {quest.deadline && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(quest.deadline).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{quest.description}</p>
                
                {quest.quest_submissions && quest.quest_submissions.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold text-sm">Submissions</h4>
                    {quest.quest_submissions.map((submission) => (
                      <div key={submission.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {submission.profiles.username}
                          </span>
                        </div>
                        {submission.proof_text && (
                          <p className="text-sm text-muted-foreground">
                            {submission.proof_text}
                          </p>
                        )}
                        {submission.proof_file_url && (
                          <div className="mt-2">
                            {submission.proof_file_type?.startsWith("image/") ? (
                              <img
                                src={submission.proof_file_url}
                                alt="Proof"
                                className="max-w-sm rounded-lg border"
                              />
                            ) : (
                              <a
                                href={submission.proof_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm"
                              >
                                View attachment
                              </a>
                            )}
                          </div>
                        )}
                        <QuestRatingSystem
                          submissionId={submission.id}
                          userId={userId}
                          status={submission.status}
                          approvalCount={submission.approval_count}
                          rejectionCount={submission.rejection_count}
                          totalMembers={totalMembers}
                        />
                      </div>
                    ))}
                  </div>
                )}
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
