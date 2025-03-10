"use client";
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface BrainViewProps {
  folders: { id: string; name: string }[];
  folderFiles: { id: string; name: string; mimeType?: string }[];
  expandedFolderId: string | null;
}

// Define node type with x and y coordinates for d3
interface Node {
  id: string;
  name: string;
  type: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  isExpanded?: boolean;
  parentId?: string;
  mimeType?: string;
}

// Define link type for d3 force simulation
interface Link {
  source: string | Node;
  target: string | Node;
  type: string;
}

export default function BrainView({ folders, folderFiles, expandedFolderId }: BrainViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create data structure for visualization
    const brainNode: Node = { id: "brain", name: "Brain", type: "brain" };
    
    // Create nodes for folders
    const folderNodes: Node[] = folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      type: "folder",
      isExpanded: folder.id === expandedFolderId
    }));
    
    // Create nodes for files (only if a folder is expanded)
    const fileNodes: Node[] = expandedFolderId 
      ? folderFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: "file",
          parentId: expandedFolderId,
          mimeType: file.mimeType
        }))
      : [];
    
    // Combine all nodes
    const nodes: Node[] = [brainNode, ...folderNodes, ...fileNodes];
    
    // Create links from brain to folders
    const folderLinks: Link[] = folderNodes.map(folder => ({
      source: "brain",
      target: folder.id,
      type: "brain-folder"
    }));
    
    // Create links from expanded folder to its files
    const fileLinks: Link[] = fileNodes.map(file => ({
      source: expandedFolderId as string,
      target: file.id,
      type: "folder-file"
    }));
    
    // Combine all links
    const links: Link[] = [...folderLinks, ...fileLinks];
    
    // Set up the SVG dimensions
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Create a force simulation
    const simulation = d3.forceSimulation<Node>()
      .nodes(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id((d) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30));
    
    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
    
    // Add a subtle gradient background
    const defs = svg.append("defs");
    
    // Create gradient
    const gradient = defs.append("radialGradient")
      .attr("id", "brain-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#1e293b");
    
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#0f172a");
    
    // Add background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#brain-gradient)");
    
    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", d => d.type === "brain-folder" ? "#6366f1" : "#4ade80")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", d => d.type === "folder-file" ? "5,5" : "none");
    
    // Create nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);
    
    // Add circles for nodes
    node.append("circle")
      .attr("r", d => d.type === "brain" ? 40 : d.type === "folder" ? 25 : 15)
      .attr("fill", d => {
        if (d.type === "brain") return "#6366f1";
        if (d.type === "folder") return "#4ade80";
        
        // Different colors for different file types
        const mimeType = d.mimeType || "";
        if (mimeType.includes("image")) return "#f472b6";
        if (mimeType.includes("pdf")) return "#f97316";
        if (mimeType.includes("text")) return "#3b82f6";
        return "#a78bfa";
      })
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2)
      .attr("opacity", 0.9);
    
    // Add pulse effect to brain node
    node.filter(d => d.type === "brain")
      .append("circle")
      .attr("r", 40)
      .attr("fill", "#6366f1")
      .attr("opacity", 0.3)
      .attr("stroke", "none")
      .append("animate")
      .attr("attributeName", "r")
      .attr("values", "40;60;40")
      .attr("dur", "3s")
      .attr("repeatCount", "indefinite");
    
    // Add text labels
    node.append("text")
      .attr("dx", 0)
      .attr("dy", d => d.type === "brain" ? 60 : d.type === "folder" ? 40 : 30)
      .attr("text-anchor", "middle")
      .text(d => d.name)
      .attr("fill", "#e2e8f0")
      .attr("font-size", d => d.type === "brain" ? 16 : 12)
      .attr("font-weight", d => d.type === "brain" ? "bold" : "normal")
      .attr("pointer-events", "none");
    
    // Add icons to nodes
    node.filter(d => d.type === "brain")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-family", "sans-serif")
      .attr("font-size", 24)
      .attr("fill", "white")
      .text("🧠");
    
    node.filter(d => d.type === "folder")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-family", "sans-serif")
      .attr("font-size", 14)
      .attr("fill", "white")
      .text("📁");
    
    node.filter(d => d.type === "file")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("fill", "white")
      .text(d => {
        const mimeType = d.mimeType || "";
        if (mimeType.includes("image")) return "🖼️";
        if (mimeType.includes("pdf")) return "📄";
        if (mimeType.includes("text")) return "📝";
        return "📄";
      });
    
    // Update positions on each tick of the simulation
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x || 0)
        .attr("y1", d => (d.source as Node).y || 0)
        .attr("x2", d => (d.target as Node).x || 0)
        .attr("y2", d => (d.target as Node).y || 0);
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [folders, folderFiles, expandedFolderId]);
  
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
}
