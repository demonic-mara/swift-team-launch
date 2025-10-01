import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, Clock, CheckCircle, XCircle } from "lucide-react";

interface QuestRatingSystemProps {
  submissionId: string;
  userId: string;
  status: string;
  approvalCount: number;
  rejectionCount: number;
  totalMembers: number;
}

const QuestRatingSystem = ({
  submissionId,
  userId,
  status,
  approvalCount,
  rejectionCount,
  totalMembers,
}: QuestRatingSystemProps) => {
  const { toast } = useToast();
  const [hasRated, setHasRated] = useState(false);
  const [userRating, setUserRating] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUserRating();
  }, [submissionId, userId]);

  const checkUserRating = async () => {
    const { data } = await supabase
      .from("quest_ratings")
      .select("rating")
      .eq("submission_id", submissionId)
      .eq("rated_by", userId)
      .maybeSingle();

    if (data) {
      setHasRated(true);
      setUserRating(data.rating);
    }
  };

  const handleRate = async (rating: "approved" | "rejected") => {
    if (hasRated) return;

    setLoading(true);
    try {
      const { error: ratingError } = await supabase
        .from("quest_ratings")
        .insert({
          submission_id: submissionId,
          rated_by: userId,
          rating,
        });

      if (ratingError) throw ratingError;

      const newApprovalCount = rating === "approved" ? approvalCount + 1 : approvalCount;
      const newRejectionCount = rating === "rejected" ? rejectionCount + 1 : rejectionCount;
      const totalRatings = newApprovalCount + newRejectionCount;
      const approvalRate = totalRatings > 0 ? (newApprovalCount / totalRatings) * 100 : 0;

      let newStatus = status;
      if (totalRatings >= Math.ceil(totalMembers * 0.5)) {
        newStatus = approvalRate >= 80 ? "completed" : "rejected";
      }

      const { error: updateError } = await supabase
        .from("quest_submissions")
        .update({
          approval_count: newApprovalCount,
          rejection_count: newRejectionCount,
          status: newStatus,
          reviewed_at: newStatus !== "pending" ? new Date().toISOString() : null,
        })
        .eq("id", submissionId);

      if (updateError) throw updateError;

      if (newStatus === "completed") {
        const { data: submission } = await supabase
          .from("quest_submissions")
          .select("quest_id, user_id")
          .eq("id", submissionId)
          .single();

        if (submission) {
          const { data: quest } = await supabase
            .from("quests")
            .select("points")
            .eq("id", submission.quest_id)
            .single();

          if (quest) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("quest_points, level")
              .eq("id", submission.user_id)
              .single();

            if (profile) {
              const newQuestPoints = profile.quest_points + quest.points;
              const newLevel = Math.floor(newQuestPoints / 100) + 1;

              await supabase
                .from("profiles")
                .update({
                  quest_points: newQuestPoints,
                  level: newLevel,
                })
                .eq("id", submission.user_id);
            }
          }
        }
      }

      setHasRated(true);
      setUserRating(rating);
      toast({
        title: "Rating submitted",
        description: `You ${rating} this quest submission`,
      });
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

  const totalRatings = approvalCount + rejectionCount;
  const approvalRate = totalRatings > 0 ? (approvalCount / totalRatings) * 100 : 0;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <ThumbsUp className="h-5 w-5 mx-auto mb-1 text-accent" />
                <p className="text-sm font-bold">{approvalCount}</p>
              </div>
              <div className="text-center">
                <ThumbsDown className="h-5 w-5 mx-auto mb-1 text-destructive" />
                <p className="text-sm font-bold">{rejectionCount}</p>
              </div>
            </div>

            <Badge
              variant={
                status === "completed"
                  ? "default"
                  : status === "rejected"
                  ? "destructive"
                  : "secondary"
              }
            >
              {status === "pending" && <Clock className="h-3 w-3 mr-1" />}
              {status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
              {status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>

          {status === "pending" && (
            <>
              <div className="text-sm text-muted-foreground">
                <p>Approval Rate: {approvalRate.toFixed(0)}%</p>
                <p className="text-xs mt-1">
                  Need 80%+ from at least 50% of members to complete
                </p>
              </div>

              {!hasRated ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRate("approved")}
                    disabled={loading}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRate("rejected")}
                    disabled={loading}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary" className="w-full justify-center">
                  You {userRating} this submission
                </Badge>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestRatingSystem;
