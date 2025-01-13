import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
import { debounce } from "@/utils/debounce";
import { updateFile } from "@/lib/api";
import EditorTabs from "@/components/EditorTabs";
import { createEditorTab, getLanguageFromPath } from "@/utils/editor";
import { PreviewWindow } from "@/components/PreviewWindow";
import { ServerControls } from "@/components/ServerControls";
import { EditorSettingsPanel } from "@/components/EditorSettingsPanel";

const ProjectDesign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState<string>(`// Write your code here
console.log("Hello, World!");`);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<Array<{
    id: string;
    path: string;
    content: string;
    language: string;
    isDirty: boolean;
  }>>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [shellSocket, setShellSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [containers, setContainers] = useState<Array<{ id: string }>>([]);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [containerError, setContainerError] = useState<string>();
  const [isContainerRunning, setIsContainerRunning] = useState(false);
  const [showContainerInfo, setShowContainerInfo] = useState(false);

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
      
      setIsContainerRunning(true);
      toast({
        title: "Container started",
        description: "Server is now running",
      });
    } catch (err) {
      toast({
        title: "Failed to start container",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  }, [toast]);

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

  const handleFileSelect = async (content: string, path: string) => {
    console.log("File selected, content:", content);
    
    // Check if file is already open
    const existingTab = openTabs.find(tab => tab.path === path);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab
    const newTab = createEditorTab(path, content);
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleTabClose = (tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (tab?.isDirty) {
      // TODO: Show confirmation dialog
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }

    setOpenTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) {
      const remainingTabs = openTabs.filter(t => t.id !== tabId);
      setActiveTabId(remainingTabs.length > 0 ? remainingTabs[0].id : null);
    }
  };

  const handleTabSelect = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleCodeChange = useCallback(async (value: string | undefined) => {
    const newCode = value ?? "";
    const activeTab = openTabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;

    setOpenTabs(prev => prev.map(tab => 
      tab.id === activeTabId
        ? { ...tab, content: newCode, isDirty: true }
        : tab
    ));
    
    if (activeTab.path) {
      try {
        console.log('Saving file:', activeTab.path);
        await updateFile(activeTab.path, newCode);
        console.log('File saved successfully');
        
        // Mark tab as clean after successful save
        setOpenTabs(prev => prev.map(tab => 
          tab.id === activeTabId
            ? { ...tab, isDirty: false }
            : tab
        ));
        
        toast({
          title: "File saved",
          description: "Changes have been saved successfully",
        });
      } catch (error) {
        console.error('Error saving file:', error);
        toast({
          title: "Error saving file",
          description: error instanceof Error ? error.message : "Failed to save file",
          variant: "destructive",
        });
      }
    }
  }, [activeTabId, openTabs]);

  // Debounce the save operation
  const debouncedHandleCodeChange = useCallback(
    debounce(async (value: string) => {
      handleCodeChange(value);
    }, 1000),
    [handleCodeChange]
  );

  const handleSave = useCallback(async () => {
    const activeTab = openTabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;

    try {
      await updateFile(activeTab.path, activeTab.content);
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTabId
          ? { ...tab, isDirty: false }
          : tab
      ));
      toast({
        title: "File saved",
        description: "Changes have been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error saving file",
        description: error instanceof Error ? error.message : "Failed to save file",
        variant: "destructive",
      });
    }
  }, [activeTabId, openTabs]);

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
          </div>
          <div className="flex items-center space-x-4">
            <EditorSettingsPanel />
            <ServerControls />
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-col h-[calc(100vh-4rem)] mt-16">
        <div className="flex flex-1 min-h-0 pb-4">
          {/* Chat Window */}
          <div className="w-[400px] border-r border-border/40 p-4 bg-sidebar">
            <div className="h-full rounded-lg border border-border/40 bg-background">
              <Chat />
            </div>
          </div>

          {/* Code Editor and Preview */}
          <div className="flex-1 p-4">
            <Tabs defaultValue="editor" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="editor">Code Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="flex-1 min-h-0">
                <div className="h-full rounded-lg border border-border/40 bg-background p-4">
                  <div className="flex flex-row h-full">
                    <FileExplorer onFileSelect={handleFileSelect} />
                    <div className="flex-1 h-full flex flex-col min-h-0">
                      <EditorTabs
                        tabs={openTabs}
                        activeTabId={activeTabId}
                        onTabSelect={handleTabSelect}
                        onTabClose={handleTabClose}
                      />
                      {activeTabId && (
                        <div className="flex-1 min-h-0">
                          <CodeEditor 
                            value={openTabs.find(t => t.id === activeTabId)?.content ?? ''}
                            onChange={debouncedHandleCodeChange}
                            language={openTabs.find(t => t.id === activeTabId)?.language}
                            path={openTabs.find(t => t.id === activeTabId)?.path}
                            onSave={handleSave}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="preview" className="flex-1 min-h-0">
                <div className="h-full rounded-lg border border-border/40 bg-background p-4">
                  <h2 className="text-lg font-semibold mb-4">Preview</h2>
                  <PreviewWindow url="http://localhost:8040" />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Terminal Section with Controls */}
        <div className="border-t border-border/40">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <ContainerControls
                  isConnected={isConnected}
                  isContainerRunning={isContainerRunning}
                  onStartContainer={handleStartContainer}
                  onStopContainer={handleStopContainer}
                  onConnect={connectToServer}
                  onDisconnect={disconnectFromServer}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContainerInfo(prev => !prev)}
                  className="gap-2"
                >
                  {showContainerInfo ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>
            </div>
            
            {/* Collapsible Container Info */}
            {showContainerInfo && (
              <div className="mb-4">
                <ContainerList containers={containers} error={containerError} />
              </div>
            )}

            {/* Terminal */}
            <div className="rounded-lg border border-border/40 bg-background">
              <Terminal shellSocket={shellSocket} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDesign;                    isContainerRunning={isContainerRunning}
                    onStartContainer={handleStartContainer}
                    onStopContainer={handleStopContainer}
                    onConnect={connectToServer}
                    onDisconnect={disconnectFromServer}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowContainerInfo(prev => !prev)}
                  >
                    {showContainerInfo ? 'Hide Details' : 'Show Details'}
                  </Button>
                </div>
              </div>

              {/* Container Info */}
              {showContainerInfo && (
                <div className="flex-none py-2 mt-2 border-t border-border/40 overflow-auto">
                  <ContainerList containers={containers} error={containerError} />
                </div>
              )}

              {/* Terminal */}
              <div className="flex-1 mt-2 min-h-0 rounded-lg border border-border/40 overflow-hidden">
                <div className="h-full flex flex-col bg-background">
                  <div className="flex-none flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-muted/40">
                    <div className="flex space-x-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors"></div>
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70 hover:bg-yellow-500 transition-colors"></div>
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500/70 hover:bg-green-500 transition-colors"></div>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">Terminal</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <Terminal shellSocket={shellSocket} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default ProjectDesign;