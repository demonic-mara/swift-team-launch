import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SubmitQuestProofProps {
  questId: string;
  questTitle: string;
  userId: string;
}

const SubmitQuestProof = ({ questId, questTitle, userId }: SubmitQuestProofProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [proofText, setProofText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!proofText && !file) {
      toast({
        title: "Error",
        description: "Please provide proof text or upload a file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let fileUrl = null;
      let fileType = null;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("quest-proofs")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("quest-proofs")
          .getPublicUrl(fileName);

        fileUrl = urlData.publicUrl;
        fileType = file.type;
      }

      // Insert submission
      const { error: submitError } = await supabase
        .from("quest_submissions")
        .insert({
          quest_id: questId,
          user_id: userId,
          proof_text: proofText || null,
          proof_file_url: fileUrl,
          proof_file_type: fileType,
          status: "pending",
        });

      if (submitError) throw submitError;

      toast({
        title: "Success",
        description: "Quest proof submitted for review!",
      });

      setProofText("");
      setFile(null);
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full">
          <Send className="h-4 w-4 mr-2" />
          Submit Proof
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Submit Quest Proof
          </DialogTitle>
          <DialogDescription>
            Submit proof for: <span className="font-semibold text-foreground">{questTitle}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proof-text">Description (Optional)</Label>
            <Textarea
              id="proof-text"
              placeholder="Describe how you completed this quest..."
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proof-file">Upload Proof (Optional)</Label>
            <Input
              id="proof-file"
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? "Submitting..." : "Submit Proof"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitQuestProof;
