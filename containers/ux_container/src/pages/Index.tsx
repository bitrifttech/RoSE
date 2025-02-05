import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { NewProjectCard } from "@/components/NewProjectCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UserSelector } from "@/components/user/UserSelector";
import { User } from "@/types/user";
import { getUser } from "@/lib/api/users";
import { useToast } from "@/components/ui/use-toast";
import { ORCHESTRATOR_API } from "@/lib/api/config";
import { Link } from "react-router-dom";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const Index = () => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Function to refresh user data
  const refreshUserData = useCallback(async () => {
    if (selectedUser) {
      try {
        const updatedUser = await getUser(selectedUser.id);
        setSelectedUser(updatedUser);
      } catch (error) {
        console.error('Failed to refresh user data:', error);
        toast({
          title: "Error",
          description: "Failed to refresh user data",
          variant: "destructive",
        });
      }
    }
  }, [selectedUser, toast]);

  // Function to handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  // Function to refresh user data when a new project is created
  const handleProjectCreated = async () => {
    await refreshUserData();
  };

  // Function to handle project deletion
  const handleProjectDelete = async (projectId: number) => {
    try {
      const response = await fetch(`${ORCHESTRATOR_API}/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      await refreshUserData();
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8eef7] via-[#d8e3f3] to-[#f7e6eb] dark:from-[#1a1f2c] dark:via-[#1f2937] dark:to-[#2d1f2f]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Projects</h1>
            <div className="flex gap-4">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">
                Login / Sign Up
              </Link>
              <DarkModeToggle />
            </div>
          </div>

          <div className="w-full max-w-md">
            <UserSelector 
              onUserSelect={handleUserSelect} 
              selectedUserId={selectedUser?.id}
            />
          </div>

          {selectedUser ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NewProjectCard 
                userId={selectedUser.id} 
                onProjectCreated={handleProjectCreated}
              />
              {selectedUser.projects.map((project, index) => (
                <div
                  key={project.id}
                  className="animate-fadeIn"
                  style={{
                    animationDelay: `${index * 150}ms`
                  }}
                >
                  <ProjectCard 
                    project={{
                      id: project.id,
                      name: project.name,
                      description: project.description || "",
                      lastModified: project.updatedAt
                    }}
                    onDelete={handleProjectDelete}
                  />
                </div>
              ))}
              {selectedUser.projects.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No projects yet. Click "New Project" to create one.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select a user to view their projects
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;