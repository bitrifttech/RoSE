import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ProjectDesign = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 right-0 left-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 z-50">
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

      <div className="flex h-[calc(100vh-4rem)] mt-16">
        {/* Chat Window */}
        <div className="w-[400px] border-r border-border/40 p-4 bg-sidebar">
          <div className="h-full rounded-lg border border-border/40 bg-background p-4">
            <h2 className="text-lg font-semibold mb-4">Chat</h2>
            {/* Chat content will go here */}
          </div>
        </div>

        {/* Code Editor and Preview */}
        <div className="flex-1 p-4">
          <Tabs defaultValue="editor" className="h-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="editor">Code Editor</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="h-[calc(100%-3rem)]">
              <div className="h-full rounded-lg border border-border/40 bg-background p-4">
                <h2 className="text-lg font-semibold mb-4">Code Editor</h2>
                {/* Code editor content will go here */}
              </div>
            </TabsContent>
            <TabsContent value="preview" className="h-[calc(100%-3rem)]">
              <div className="h-full rounded-lg border border-border/40 bg-background p-4">
                <h2 className="text-lg font-semibold mb-4">Preview</h2>
                {/* Preview content will go here */}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProjectDesign;