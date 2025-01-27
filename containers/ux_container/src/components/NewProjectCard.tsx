import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface NewProjectCardProps {
  userId: number;
  onProjectCreated: () => void;
}

export function NewProjectCard({ userId, onProjectCreated }: NewProjectCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateProject() {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("http://localhost:8000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          name: name.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      setName("");
      setDescription("");
      setIsDialogOpen(false);
      onProjectCreated();
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <Card
        className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 duration-300 cursor-pointer h-full min-h-[200px] flex items-center justify-center border-2 border-dashed"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="flex flex-col items-center gap-4 text-muted-foreground group-hover:text-primary transition-colors">
          <Plus className="w-8 h-8" />
          <span className="font-medium">New Project</span>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Project"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project"
              />
            </div>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!name.trim() || isCreating}>
                {isCreating ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
