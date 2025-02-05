import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { NewProjectCard } from "@/components/NewProjectCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { User } from "@/types/user";
import { getUser } from "@/lib/api/users";
import { useToast } from "@/components/ui/use-toast";
import { ORCHESTRATOR_API } from "@/lib/api/config";
import { Link } from "react-router-dom";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Load user data on component mount
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        // If no user is logged in, redirect to auth page
        navigate('/auth');
        return;
      }

      try {
        const userData = JSON.parse(storedUser);
        // Fetch fresh user data to get latest projects
        const freshUserData = await getUser(userData.id);
        setUser(freshUserData);
      } catch (error) {
        console.error('Failed to load user data:', error);
        toast({
          title: "Error",
          description: "Failed to load user data. Please log in again.",
          variant: "destructive",
        });
        navigate('/auth');
      }
    };

    loadUser();
  }, [navigate, toast]);

  // Function to refresh user data
  const refreshUserData = useCallback(async () => {
    if (user) {
      try {
        const updatedUser = await getUser(user.id);
        setUser(updatedUser);
      } catch (error) {
        console.error('Failed to refresh user data:', error);
        toast({
          title: "Error",
          description: "Failed to refresh user data",
          variant: "destructive",
        });
      }
    }
  }, [user, toast]);

  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/auth');
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      // Refresh the user data to update the projects list
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

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NewProjectCard onProjectCreated={handleProjectCreated} userId={user.id} />
          {user.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={() => handleProjectDelete(project.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;