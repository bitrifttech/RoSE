import React from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

interface ResizeHandleProps {
  className?: string;
  id?: string;
}

function ResizeHandle({ className = "", id }: ResizeHandleProps) {
  return (
    <PanelResizeHandle
      className={`w-2 hover:bg-accent/50 transition-colors ${className}`}
      id={id}
    >
      <div className="w-px h-full bg-border/40 mx-auto" />
    </PanelResizeHandle>
  );
}

export { Panel, PanelGroup, ResizeHandle };
