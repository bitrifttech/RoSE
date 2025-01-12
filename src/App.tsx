import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { EditorSettingsProvider } from "@/contexts/EditorSettings";
import Index from "@/pages/Index";
import ProjectDesign from "@/pages/ProjectDesign";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <EditorSettingsProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/project/:id" element={<ProjectDesign />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </EditorSettingsProvider>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;