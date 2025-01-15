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
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [containers, setContainers] = useState<Container[]>([]);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [containerError, setContainerError] = useState<string>();
  const [isContainerRunning, setIsContainerRunning] = useState(false);
  const [showContainerInfo, setShowContainerInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
      const containersData = await response.json();
      const typedContainers: Container[] = containersData.map((container: any) => ({
        id: container.id,
        name: container.name || 'Unnamed',
        status: container.status || 'Unknown',
        ports: container.ports || []
      }));
      setContainers(typedContainers);
      setContainerError(undefined);
      
      setIsContainerRunning(typedContainers.length > 0);
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
    
    const existingTab = openTabs.find(tab => tab.path === path);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const newTab = createEditorTab(path, content);
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleTabClose = (tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (tab?.isDirty) {
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

  useEffect(() => {
    return () => {
      if (shellSocket) {
        shellSocket.close();
      }
    };
  }, [shellSocket]);

  useEffect(() => {
    refreshContainers();
    const interval = setInterval(refreshContainers, 5000);
    return () => clearInterval(interval);
  }, [refreshContainers]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-[#e8eef7] via-[#d8e3f3] to-[#f7e6eb] dark:from-[#1a1f2c] dark:via-[#1f2937] dark:to-[#2d1f2f]">
      <div className="flex items-center justify-between p-3 border-b border-[#b8c7e0]/30 dark:border-white/10 bg-white/10 backdrop-blur-md dark:bg-black/10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
            className="hover:bg-[#d8e3f3]/50 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 text-[#4a5d7e] dark:text-white/70" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-medium text-[#4a5d7e] dark:text-white/90">Nova Project</h1>
            <p className="text-xs text-[#4a5d7e]/70 dark:text-white/50">Development Environment</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#d8e3f3]/30 dark:bg-white/5">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-400" : "bg-yellow-400"
            )}></div>
            <span className="text-sm text-[#4a5d7e] dark:text-white/70">
              Shell {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(prev => !prev)}
            className="hover:bg-[#d8e3f3]/50 dark:hover:bg-white/10"
          >
            <Settings2 className="h-4 w-4 text-[#4a5d7e] dark:text-white/70" />
          </Button>
          <DarkModeToggle />
        </div>
      </div>

      <PanelGroup direction="vertical" className="flex-1">
        <Panel defaultSize={70} minSize={30}>
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full p-4 flex flex-col">
                <div className="flex-none flex justify-center mb-4">
                  <div className="rounded-2xl p-2 relative">
                    <div className="absolute inset-0 bg-gradient-radial from-white via-white/50 to-transparent dark:from-white dark:via-white/30 dark:to-transparent rounded-2xl blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-radial from-white via-white/50 to-transparent dark:from-white dark:via-white/30 dark:to-transparent rounded-2xl blur-md"></div>
                    <img src="/rose_logo1.png" alt="Rose Logo" className="h-44 w-auto object-contain relative z-10" />
                  </div>
                </div>
                <div className="flex-1 rounded-xl border border-[#b8c7e0]/30 dark:border-white/10 bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-lg">
                  <Chat />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-2 hover:bg-[#d8e3f3]/50 dark:hover:bg-white/10 transition-colors">
              <div className="w-px h-full bg-[#b8c7e0]/20 dark:bg-white/10 mx-auto" />
            </PanelResizeHandle>

            <Panel defaultSize={20} minSize={15}>
              <div className="h-full p-4">
                <div className="h-full rounded-xl border border-[#b8c7e0]/30 dark:border-white/10 bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-lg">
                  <FileExplorer onFileSelect={handleFileSelect} />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-2 hover:bg-[#d8e3f3]/50 dark:hover:bg-white/10 transition-colors">
              <div className="w-px h-full bg-[#b8c7e0]/20 dark:bg-white/10 mx-auto" />
            </PanelResizeHandle>

            <Panel minSize={30}>
              <div className="h-full p-4">
                <div className="h-full rounded-xl border border-[#b8c7e0]/30 dark:border-white/10 bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-lg">
                  <Tabs defaultValue="editor" className="h-full flex flex-col">
                    <TabsList className="flex-none grid w-full grid-cols-2">
                      <TabsTrigger value="editor">Code Editor</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="flex-1 mt-0">
                      <div className="h-full p-4">
                        <div className="h-full flex flex-col">
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
                    </TabsContent>

                    <TabsContent value="preview" className="flex-1 mt-0">
                      <div className="h-full p-4">
                        <PreviewWindow url="http://localhost:8040" />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="h-2 hover:bg-[#d8e3f3]/50 dark:hover:bg-white/10 transition-colors">
          <div className="h-px w-full bg-[#b8c7e0]/20 dark:bg-white/10 mx-auto" />
        </PanelResizeHandle>

        <Panel defaultSize={30} minSize={20}>
          <div className="h-full flex flex-col bg-background">
            <div className="flex-1 min-h-0 p-4 flex flex-col">
              {/* Terminal Controls Bar */}
              <div className="flex-none flex items-center justify-between py-2 px-1">
                {/* Left side: Container and Server Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ContainerControls
                      isConnected={isConnected}
                      isContainerRunning={isContainerRunning}
                      onStartContainer={handleStartContainer}
                      onStopContainer={handleStopContainer}
                      onConnect={connectToServer}
                      onDisconnect={disconnectFromServer}
                    />
                    <ConnectionStatus isConnected={isConnected} />
                  </div>
                  <div className="h-8 w-px bg-[#b8c7e0]/20 dark:bg-white/10" />
                  <div className="flex items-center gap-2">
                    <ServerControls />
                  </div>
                </div>
                
                {/* Right side: Info Toggle */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowContainerInfo(prev => !prev)}
                    className="flex items-center gap-2"
                  >
                    {showContainerInfo ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
              </div>

              {/* Container Info Panel */}
              {showContainerInfo && (
                <div className="flex-none py-2 mt-2 border-t border-[#b8c7e0]/40 dark:border-white/10">
                  <ContainerList containers={containers} error={containerError} />
                </div>
              )}

              {/* Terminal Window */}
              <div className="flex-1 mt-2 min-h-0 rounded-xl border border-[#b8c7e0]/30 dark:border-white/10 bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-lg overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="flex-none flex items-center justify-between px-3 py-1.5 border-b border-[#b8c7e0]/20 dark:border-white/10 bg-white/5 dark:bg-white/5">
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

      {showSettings && (
        <EditorSettingsPanel onClose={() => setShowSettings(false)} /> 
      )}
    </div>
  );
};

export default ProjectDesign;
