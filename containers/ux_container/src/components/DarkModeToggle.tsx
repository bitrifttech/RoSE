import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial dark mode preference
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    
    // Toggle the dark class on the root element
    document.documentElement.classList.toggle("dark");
    
    // Store the preference
    localStorage.setItem("darkMode", newMode ? "dark" : "light");
    
    console.log("Dark mode toggled:", newMode ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      className="hover:bg-accent/50"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-sidebar-foreground" />
      ) : (
        <Moon className="h-4 w-4 text-sidebar-foreground" />
      )}
    </Button>
  );
}