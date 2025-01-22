import { useNavigate } from "react-router-dom";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const projects = [
  {
    id: 1,
    name: "Project One",
    description: "A sample project description",
    lastModified: new Date().toISOString(),
  },
  // Add more sample projects as needed
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8eef7] via-[#d8e3f3] to-[#f7e6eb] dark:from-[#1a1f2c] dark:via-[#1f2937] dark:to-[#2d1f2f]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
            My Projects
          </h1>
          <Button
            onClick={() => navigate("/project/new")}
            className="flex items-center gap-2 transition-all duration-300 hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="animate-fadeIn"
              style={{
                animationDelay: `${index * 150}ms`
              }}
            >
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;