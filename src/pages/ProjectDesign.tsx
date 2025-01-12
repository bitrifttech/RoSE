import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Terminal from "@/components/Terminal";
import CodeEditor from "@/components/CodeEditor";
import Chat from "@/components/Chat";
import FileExplorer from "@/components/FileExplorer";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ContainerControls } from "@/components/ContainerControls";
import { ContainerList } from "@/components/ContainerList";
import { Container } from "@/types/container";

const ProjectDesign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState<string>(`// Write your code here
console.log("Hello, World!");`);
  const [shellSocket, setShellSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [containers, setContainers] = useState<Array<{ id: string }>>([]);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [containerError, setContainerError] = useState<string>();
  const [isContainerRunning, setIsContainerRunning] = useState(false);

  const refreshContainers = useCallback(async () => {
    try {
      const response = await fetch('/api/containers', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch containers');
      }
      const containers = await response.json();
      setContainers(containers);
      setContainerError(undefined);
      
      // Update container running state based on if there are any containers
      setIsContainerRunning(containers.length > 0);
    } catch (err) {
      setContainerError(err instanceof Error ? err.message : 'Failed to fetch containers');
      setContainers([]);
      setIsContainerRunning(false);
    }
  }, []);

  const handleStartContainer = useCallback(async () => {
    try {
      const response = await fetch('/api/container', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to start container');
      }
      const container = await response.json();
      setContainerId(container.id);
      toast({
        title: "Container started",
        description: `Container ID: ${container.id.substring(0, 12)}`,
      });
      refreshContainers();
    } catch (err) {
      toast({
        title: "Failed to start container",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  }, [toast, refreshContainers]);

  const handleStopContainer = useCallback(async () => {
    // If there's a container running, use the first one in the list
    const containerToStop = containers[0];
    if (!containerToStop) {
      toast({
        title: "No container to stop",
        description: "There are no running containers",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/container/${containerToStop.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to stop container');
      }
      toast({
        title: "Container stopped",
        description: `Container ID: ${containerToStop.id.substring(0, 12)}`,
      });
      // Only clear containerId if it matches the one we just stopped
      if (containerId === containerToStop.id) {
        setContainerId(null);
      }
      refreshContainers();
    } catch (err) {
      toast({
        title: "Failed to stop container",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  }, [containers, containerId, toast, refreshContainers]);

  const connectToServer = useCallback(() => {
    if (shellSocket) {
      console.log('Already connected, disconnecting first...');
      shellSocket.close();
    }

    console.log('Connecting to shell server...');
    const shell = new WebSocket('ws://127.0.0.1:8030/shell');

    shell.onopen = () => {
      console.log('Shell WebSocket connected');
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "Successfully connected to the shell server",
      });
    };

    shell.onclose = () => {
      console.log('Shell WebSocket closed');
      setShellSocket(null);
      setIsConnected(false);
    };

    shell.onerror = (error) => {
      console.error('Shell WebSocket error:', error);
      toast({
        title: "Connection error",
        description: "Failed to connect to the shell server",
        variant: "destructive",
      });
    };

    setShellSocket(shell);
  }, [shellSocket, toast]);

  const disconnectFromServer = useCallback(() => {
    if (shellSocket) {
      console.log('Disconnecting from shell server...');
      shellSocket.close();
      setShellSocket(null);
      setIsConnected(false);
    }
  }, [shellSocket]);

  const handleFileSelect = (content: string) => {
    console.log("File selected, content:", content);
    setCode(content);
  };

  // Cleanup WebSocket connection when component unmounts
  useEffect(() => {
    return () => {
      if (shellSocket) {
        shellSocket.close();
      }
    };
  }, [shellSocket]);

  // Refresh containers periodically
  useEffect(() => {
    refreshContainers();
    const interval = setInterval(refreshContainers, 5000);
    return () => clearInterval(interval);
  }, [refreshContainers]);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 right-0 left-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 z-50">
        <div className="container h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-accent/50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <ConnectionStatus isConnected={isConnected} />
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleStartContainer}
              disabled={isContainerRunning}
            >
              Start Container
            </Button>
            <Button
              onClick={handleStopContainer}
              disabled={!isContainerRunning}
              variant="destructive"
            >
              Stop Container
            </Button>
            <Button
              onClick={isConnected ? disconnectFromServer : connectToServer}
              variant={isConnected ? "destructive" : "default"}
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
          <DarkModeToggle />
        </div>
      </header>

      <div className="flex flex-col h-[calc(100vh-4rem)] mt-16">
        <div className="container py-4">
          <ContainerList containers={containers} error={containerError} />
        </div>
        
        <div className="flex flex-1 min-h-0">
          {/* Chat Window */}
          <div className="w-[400px] border-r border-border/40 p-4 bg-sidebar">
            <div className="h-full rounded-lg border border-border/40 bg-background">
              <Chat />
            </div>
          </div>

          {/* Code Editor and Preview */}
          <div className="flex-1">
            <Tabs defaultValue="editor" className="h-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="editor">Code Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="h-[calc(100%-3rem)]">
                <div className="h-full rounded-lg border border-border/40 bg-background p-4">
                  <div className="flex flex-row h-full">
                    <FileExplorer onFileSelect={handleFileSelect} />
                    <div className="flex-1 h-full">
                      <CodeEditor 
                        value={code} 
                        onChange={(value) => setCode(value ?? "")}
                      />
                    </div>
                  </div>
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

        {/* Terminal Window */}
        <div className="p-4">
          <Terminal shellSocket={shellSocket} />
        </div>
      </div>
    </div>
  );
};

export default ProjectDesign;