import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Home, Settings, Plus, Layout } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const Index = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState([
    { id: 1, name: "E-commerce Redesign", description: "Modern UI refresh for online store", lastModified: "2024-03-20" },
    { id: 2, name: "Dashboard UI", description: "Analytics dashboard interface", lastModified: "2024-03-19" },
  ]);

  const handleNewProject = () => {
    toast({
      title: "Coming Soon",
      description: "New project creation will be available in the next update.",
    });
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-r-sidebar-border/40 shadow-lg shadow-sidebar-border/5" variant="sidebar" collapsible="icon">
          <SidebarHeader className="flex items-center justify-between border-b border-b-sidebar-border/40 px-6 py-4">
            <h2 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">Nova</h2>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  className="w-full justify-start gap-3 px-4 py-2 hover:bg-accent/50"
                  tooltip="Home"
                >
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  className="w-full justify-start gap-3 px-4 py-2 hover:bg-accent/50"
                  tooltip="Projects"
                >
                  <Layout className="h-4 w-4" />
                  <span className="font-medium">Projects</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  className="w-full justify-start gap-3 px-4 py-2 hover:bg-accent/50"
                  tooltip="Settings"
                >
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
            <DarkModeToggle />
            <SidebarTrigger />
          </div>
          <div className="container max-w-7xl py-8">
            <div className="mb-8 flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
                  Projects
                </h1>
                <p className="text-lg text-muted-foreground">
                  Manage and create UX design projects
                </p>
              </div>
              <Button 
                onClick={handleNewProject} 
                size="lg" 
                className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              >
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;