import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProjectVersions, ProjectVersion } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { History } from "lucide-react";
import { format } from "date-fns";

interface ProjectVersionsDialogProps {
  projectId: number;
}

export function ProjectVersionsDialog({ projectId }: ProjectVersionsDialogProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      getProjectVersions(projectId)
        .then(setVersions)
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to load project versions",
            variant: "destructive",
          });
        });
    }
  }, [projectId, isOpen, toast]);

  const handleRestore = (version: ProjectVersion) => {
    // TODO: Implement restore functionality
    toast({
      title: "Not implemented",
      description: `Restore to version ${version.version} will be implemented soon`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          View History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Project History</DialogTitle>
          <DialogDescription>
            View and restore previous versions of your project
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>{version.version}</TableCell>
                  <TableCell>{version.message || "No message"}</TableCell>
                  <TableCell>
                    {format(new Date(version.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    {version.isActive ? (
                      <span className="text-green-600 dark:text-green-400">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(version)}
                      disabled={version.isActive}
                    >
                      Restore
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
