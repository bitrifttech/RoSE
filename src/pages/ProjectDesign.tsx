import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const ProjectDesign = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 right-0 left-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
        <div className="container h-full flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
            className="hover:bg-accent/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
            Project Design
          </h1>
          <DarkModeToggle />
        </div>
      </header>
      <main className="container max-w-7xl py-8 mt-16">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Project ID: {id}</h2>
            <p className="text-muted-foreground mt-2">
              Design workspace for your project
            </p>
          </div>
          {/* Project design content will go here */}
        </div>
      </main>
    </div>
  );
};

export default ProjectDesign;