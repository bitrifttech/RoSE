import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";

interface Project {
  id: number;
  name: string;
  description: string;
  lastModified: string;
}

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
  const formattedDate = new Date(project.lastModified).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 duration-300">
      <CardHeader>
        <div className="flex items-start justify-between space-x-4">
          <div className="space-y-1.5">
            <CardTitle className="text-xl font-semibold tracking-tight bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
              {project.name}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-muted-foreground">
              {project.description}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0 rounded-full hover:bg-accent"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-muted-foreground">
          <span className="font-medium">Last modified:</span>
          <span className="ml-2">{formattedDate}</span>
        </div>
      </CardContent>
    </Card>
  );
};