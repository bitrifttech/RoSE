import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { EditorSettingsProvider } from "@/contexts/EditorSettings";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import ProjectDesign from "@/pages/ProjectDesign";

function App() {
  return (
    <>
      <EditorSettingsProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/project/:id" element={<ProjectDesign />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </EditorSettingsProvider>
      <Toaster />
    </>
  );
}

export default App;