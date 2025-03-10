"use client";
import { useEffect, useState, useRef, useCallback, MouseEvent as ReactMouseEvent, DragEvent } from "react";
import { listDriveFolders, listDriveFiles, deleteFile } from "@/lib/googleDrive";
import { getAuth } from "firebase/auth";
import { uploadFileToDrive, createDriveFolder } from "@/lib/googleDrive";
import { Loader2, Plus, Folder, FileText, Upload, Trash2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Login from "@/components/Login";
import FileViewer from "@/components/FileViewer";
import BrainView from "@/components/BrainView";

interface MergedSidebarUploadProps {
  onFileSelect: (fileId: string, fileType: string | null) => void;
  updateBrainData?: (folders: { id: string; name: string }[], expandedFolderId: string | null, folderFiles: { id: string; name: string; mimeType?: string }[]) => void;
}

export default function Dashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showBrainView, setShowBrainView] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<{ id: string; name: string; mimeType?: string }[]>([]);
  
  // We don't need to manage sidebar width here as it's handled within the MergedSidebarUpload component

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
      } else {
        setIsAuthenticated(true);
        setAccessToken(token);
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, [router]);

  const handleFileSelect = (fileId: string, fileType: string | null) => {
    console.log("Selected file:", fileId, fileType);
    setSelectedFileId(fileId);
    setSelectedFileType(fileType);
  };

  const handleToggleBrainView = () => {
    console.log("Toggle brain view clicked");
    setShowBrainView(prev => !prev);
  };
  
  // Function to update folders and files for brain visualization
  const updateBrainData = (newFolders: { id: string; name: string }[], newExpandedFolderId: string | null, newFolderFiles: { id: string; name: string; mimeType?: string }[]) => {
    setFolders(newFolders);
    setExpandedFolderId(newExpandedFolderId);
    setFolderFiles(newFolderFiles);
  };
  
  // We'll pass the updateBrainData function directly to the MergedSidebarUpload component

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-2 text-white">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Show login component instead of null to allow immediate login
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to Your Notes</h1>
          <p className="text-gray-400 max-w-md mx-auto">Please sign in to access your dashboard and notes</p>
        </div>
        <div className="relative self-center"> {/* Position the login button in the center */}
          <Login />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-[var(--font-open-sans)]">
      {/* Login Component - Will float on top due to its fixed positioning */}
      <div className="relative z-50">
        <Login onToggleBrainView={handleToggleBrainView} />
      </div>
      
      <div className="h-screen px-6">
        
        {/* Unified Container - Combines sidebar and content in one view */}
        <div className="flex h-[calc(100vh-24px)] bg-gray-800 rounded-xl shadow-2xl border border-gray-700 mt-3 overflow-hidden">
          {/* Sidebar - No fixed width, let the component handle its own width */}
          <div className="h-full relative" style={{ flexShrink: 0, overflow: 'hidden' }}>
            <MergedSidebarUpload 
              onFileSelect={handleFileSelect} 
              // Removed onToggleBrainView prop as it's not in the interface
              updateBrainData={updateBrainData}
            />
          </div>
          
          {/* Main Content Area - Flex grow to fill remaining space */}
          <div className="flex-grow p-6 overflow-y-auto">
            {showBrainView ? (
              <div className="h-full w-full rounded-xl overflow-hidden">
                <BrainView 
                  folders={folders} 
                  folderFiles={folderFiles} 
                  expandedFolderId={expandedFolderId} 
                />
              </div>
            ) : (
              <FileViewer 
                fileId={selectedFileId} 
                accessToken={accessToken} 
                fileType={selectedFileType} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MergedSidebarUpload({ onFileSelect, updateBrainData }: MergedSidebarUploadProps) {
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<{ id: string; name: string; mimeType?: string }[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progressMessages, setProgressMessages] = useState<{ [key: string]: number }>({});
  // Add a state to force re-renders when summarization completes
  const [completedSummarizations, setCompletedSummarizations] = useState<string[]>([]);
  // Add a counter to force re-renders
  const [updateCounter, setUpdateCounter] = useState(0);
  // Add a state to directly track summarized files
  const [summarizedFiles, setSummarizedFiles] = useState<{[key: string]: boolean}>({});
  const [processingFiles, setProcessingFiles] = useState(new Set<string>());
  const [isDragging, setIsDragging] = useState(false);
  const [activeDragFolderId, setActiveDragFolderId] = useState<string | null>(null);
  const [deletingFiles, setDeletingFiles] = useState(new Set<string>());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(400); // Increased from 288px for better readability
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);


  const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  useEffect(() => {
    const fetchFolders = async () => {
      if (!accessToken) return;
      const folderList = await listDriveFolders();
      setFolders(folderList);
    };

    fetchFolders();
  }, [accessToken]);

  // Create a ref for the WebSocket connection
  const wsRef = useRef<WebSocket | null>(null);
  
  // Add effect to force UI updates when processing state changes
  useEffect(() => {
    console.log("Processing files state changed:", [...processingFiles]);
    // Force a re-render when processing files change
    setUpdateCounter(prev => prev + 1);
  }, [processingFiles]);

  // Add effect to force UI updates when progress messages change
  useEffect(() => {
    console.log("Progress messages changed:", progressMessages);
    // Force a re-render when progress messages change
    setUpdateCounter(prev => prev + 1);
    
    // Check for any files that have completed (progress = 100) and make sure they're in summarizedFiles
    Object.entries(progressMessages).forEach(([fileId, progress]) => {
      if (progress === 100) {
        setSummarizedFiles(prev => {
          if (!prev[fileId]) {
            console.log(`Adding file ${fileId} to summarizedFiles from progress messages effect`);
            return {...prev, [fileId]: true};
          }
          return prev;
        });
      }
    });
  }, [progressMessages]);
  
  // Add effect to force UI updates when completed summarizations change
  useEffect(() => {
    console.log("Completed summarizations changed:", completedSummarizations);
    // Force a re-render when completed summarizations change
    setUpdateCounter(prev => prev + 1);
    
    // Debug: Log all button states after completedSummarizations changes
    if (folderFiles.length > 0) {
      console.log("Current folder files:", folderFiles.map(f => f.id));
      folderFiles.forEach(file => {
        const isProcessing = processingFiles.has(file.id);
        const progress = progressMessages[file.id];
        const isCompleted = completedSummarizations.includes(file.id);
        console.log(`EFFECT: Button state for ${file.id}: processing=${isProcessing}, progress=${progress}, completed=${isCompleted}`);
      });
    }
  }, [completedSummarizations, folderFiles, processingFiles, progressMessages]);

  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    console.log("Connecting to WebSocket...");
    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    // Create a new WebSocket connection
    const ws = new WebSocket("ws://140.245.111.121:8051/progress");
    wsRef.current = ws;
    
    // Handle connection opening
    ws.onopen = () => {
      console.log("WebSocket connection established");
      setMessage("Connected to server for real-time updates");
    };
    
    // Handle incoming messages
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { fileId, progress, message: progressMessage } = data;
        
        if (!fileId || progress === undefined) {
          console.log("Received ping or non-progress message:", data);
          return; // Ignore pings or malformed messages
        }
        
        console.log(`Progress Update: ${fileId} - ${progress}% - ${progressMessage || ''}`);
        
        // First update the processing set if needed
        if ([100, -1].includes(progress)) {
          console.log(`Summarization ${progress === 100 ? 'completed' : 'failed'} for file ${fileId}`);
          
          // Remove from processing set to update button state
          setProcessingFiles((prev) => {
            const newSet = new Set(prev);
            newSet.delete(fileId);
            console.log(`Removing file ${fileId} from processing set, new set size: ${newSet.size}`);
            return newSet;
          });
          
          // Show appropriate message
          if (progress === 100) {
            setMessage(`Summarization complete for file: ${fileId}`);
            // Add to completed summarizations to trigger UI updates
            setCompletedSummarizations(prev => {
              console.log(`Adding ${fileId} to completedSummarizations. Current: [${prev.join(', ')}]`);
              return [...prev, fileId];
            });
            // Directly mark this file as summarized in the summarizedFiles state
            setSummarizedFiles(prev => {
              const newState = {...prev, [fileId]: true};
              console.log(`Marking file ${fileId} as summarized directly in summarizedFiles state:`, newState);
              return newState;
            });
            
            // Explicitly update progress messages to ensure UI updates
            setProgressMessages(prev => {
              // Make sure we set progress to 100 for this file
              const newState = {...prev, [fileId]: 100};
              console.log(`Explicitly setting progress to 100 for file ${fileId} in progressMessages:`, newState);
              return newState;
            });
            
            // Increment update counter to force re-render
            setUpdateCounter(prev => prev + 1);
            
            // Refresh the file list in the current folder if expanded
            if (expandedFolderId) {
              const accessToken = localStorage.getItem("accessToken");
              if (accessToken) {
                listDriveFiles(accessToken, expandedFolderId).then(files => {
                  setFolderFiles(files);
                  console.log("Refreshed file list after summarization completed");
                });
              }
            }
          } else if (progress === -1) {
            setMessage(`Summarization failed for file: ${fileId} - ${progressMessage || 'Unknown error'}`);
          }
        }
        
        // Update progress messages immediately to ensure UI updates correctly
        setProgressMessages((prev) => {
          const newState = { ...prev, [fileId]: progress };
          console.log("New progress state:", newState);
          
          // If progress is 100, also update summarizedFiles directly
          if (progress === 100) {
            setSummarizedFiles(prevSummarized => ({
              ...prevSummarized,
              [fileId]: true
            }));
          }
          
          return newState;
        });
      } catch (error) {
        console.error("Error processing WebSocket message:", error, event.data);
      }
    };
    
    // Handle errors
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessage("Connection error. Reconnecting...");
      
      // Try to reconnect after a short delay
      setTimeout(() => connectWebSocket(), 3000);
    };
    
    // Handle connection closing
    ws.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      
      // Only attempt to reconnect if this wasn't a normal closure
      if (event.code !== 1000) {
        setMessage("Connection lost. Reconnecting...");
        setTimeout(() => connectWebSocket(), 3000);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Fetch folders for brain visualization
  useEffect(() => {
    const fetchFolders = async () => {
      if (!accessToken) return;
      try {
        const folderList = await listDriveFolders();
        setFolders(folderList);
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    };
    
    fetchFolders();

  }, [accessToken]);
  
  // Listen for folder updates from MergedSidebarUpload component
  useEffect(() => {
    // This effect will run when folders, expandedFolderId, or folderFiles change
    // We don't need to do anything here as the state is already updated
  }, [folders, expandedFolderId, folderFiles]);
  
  // Establish WebSocket connection when component mounts
  useEffect(() => {
    console.log("Establishing WebSocket connection...");
    connectWebSocket();
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);
  
  
  

  const handleFolderClick = async (folderId: string) => {
    // Using expandedFolderId from closure (added to dependency array below)
    if (expandedFolderId === folderId) {
      setExpandedFolderId(null);
      setFolderFiles([]);
      // Update parent component's state for brain visualization
      if (updateBrainData) {
        updateBrainData(folders, null, []);
      }
    } else {
      if (!accessToken) return;
      const files = await listDriveFiles(accessToken, folderId);
      setExpandedFolderId(folderId);
      setFolderFiles(files);
      // Update parent component's state for brain visualization
      if (updateBrainData) {
        updateBrainData(folders, folderId, files);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setMessage("Please enter a folder name.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setMessage("User not authenticated.");
      return;
    }

    const uid = user.uid;

    try {
      const createdFolderId = await createDriveFolder(newFolderName);
      if (createdFolderId) {
        const updatedFolders = [...folders, { id: createdFolderId, name: newFolderName }];
        setFolders(updatedFolders);
        setMessage(`Folder created successfully: ${newFolderName}`);
        
        // Update parent component's state for brain visualization
        if (updateBrainData) {
          updateBrainData(updatedFolders, expandedFolderId, folderFiles);
        }
      }

      const response = await fetch("http://140.245.111.121:8051/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName: newFolderName, uid, folderId: createdFolderId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create folder on server.");
      }

      setNewFolderName("");
      setMessage(`Folder created and synced: ${newFolderName}`);
    } catch (error) {
      setMessage(`Error creating folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleUpload = async (folderId: string) => {
    if (!selectedFile) {
      setMessage("Please select a file first.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setMessage("User not authenticated.");
      return;
    }

    const uid = user.uid;
    setUploading(true);
    setMessage(null);

    try {
      await uploadFileToDrive(selectedFile, folderId);
      await sendFileToServer(selectedFile, selectedFile.name, uid, folderId);
      setMessage(`File uploaded successfully: ${selectedFile.name}`);
      setSelectedFile(null);
      
      // Refresh the file list after upload
      if (!accessToken) return;
      const files = await listDriveFiles(accessToken, folderId);
      setFolderFiles(files);
      
      // Update brain visualization data
      if (updateBrainData) {
        updateBrainData(folders, expandedFolderId, files);
      }
    } catch (error) {
      setMessage(`Error uploading file: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading(false);
    }
  };
  
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!accessToken) return;
    
    // Update UI state immediately
    setDeletingFiles(prev => {
      const newSet = new Set(prev);
      newSet.add(fileId);
      return newSet;
    });
    setShowDeleteConfirm(null);
    
    try {
      // Delete from Google Drive
      const success = await deleteFile(accessToken, fileId);
      
      if (success) {
        // Update UI by removing the file from the list
        const updatedFiles = folderFiles.filter(file => file.id !== fileId);
        setFolderFiles(updatedFiles);
        setMessage(`File deleted: ${fileName}`);
        
        // Update brain visualization data
        if (updateBrainData) {
          updateBrainData(folders, expandedFolderId, updatedFiles);
        }
        
        // Also delete from server if needed
        if (expandedFolderId) {
          try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
              const uid = user.uid;
              await fetch("http://140.245.111.121:8051/delete-file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  uid,
                  folderId: expandedFolderId,
                  fileId
                })
              });
            }
          } catch (serverError) {
            console.error("Error deleting file from server:", serverError);
            // Continue anyway since Google Drive deletion was successful
          }
        }
      } else {
        throw new Error("Failed to delete file");
      }
    } catch (error) {
      setMessage(`Error deleting file: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Remove from deleting state
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  const handleSummarizeFile = async (fileId: string, fileName: string) => {
    // Prevent multiple processing of the same file
    if (processingFiles.has(fileId)) return;
    
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    
    const uid = user.uid;
    const folderId = expandedFolderId || "";
    
    try {
      // Update UI immediately before the API call
      setProcessingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.add(fileId);
        return newSet;
      });
      
      // Initialize progress at 0%
      setProgressMessages((prev) => {
        // Force a new object to trigger re-render
        return { ...prev, [fileId]: 0 };
      });
      
      if (!accessToken) return;
      
      // Ensure WebSocket connection is active
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        console.log("WebSocket not connected, attempting to reconnect...");
        connectWebSocket();
      }
      
      // Send processing request
      const response = await fetch("http://140.245.111.121:8051/process-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          folderId,
          filename: fileName,
          accessToken: accessToken,
          fileId: fileId, // Send fileId to help with progress tracking
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Processing failed: ${errorText}`);
      }
      
      // Try to parse the response
      const responseData = await response.json().catch(() => ({}));
      console.log("Process response:", responseData);
      
      // Show success message
      setMessage(`Summarization started: ${fileName}`);
      
      // Note: We don't remove from processingFiles here because
      // the WebSocket will handle that when progress reaches 100%
    } catch (error) {
      console.error("Processing error:", error);
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Remove from processing set on error
      setProcessingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      
      // Set progress to -1 (failed)
      setProgressMessages((prev) => {
        // Force a new object to trigger re-render
        const newState = { ...prev, [fileId]: -1 };
        console.log("Setting failed state:", newState);
        return newState;
      });
      
      // Force UI update
      setTimeout(() => {
        setProcessingFiles((prev) => new Set(prev));
      }, 50);
    }
  };
  
  

  // Simple, direct resize handler
  const handleMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Initial values
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    // Set resizing state
    setIsResizing(true);
    
    function onMouseMove(moveEvent: MouseEvent) {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));
      setSidebarWidth(newWidth);
    }
    
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setIsResizing(false);
    }
    
    // Add listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Handle drag and drop events
  const handleDragEnter = (e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setActiveDragFolderId(folderId);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setActiveDragFolderId(null);
  };

  const handleDrop = async (e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setActiveDragFolderId(null);
    
    // Get the dropped files
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    // Take the first file (we'll only handle one file at a time for now)
    const file = files[0];
    setSelectedFile(file);
    
    // Automatically start the upload process
    if (file) {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setMessage("User not authenticated.");
        return;
      }

      const uid = user.uid;
      setUploading(true);
      setMessage(null);

      try {
        await uploadFileToDrive(file, folderId);
        await sendFileToServer(file, file.name, uid, folderId);
        setMessage(`File uploaded successfully: ${file.name}`);
        setSelectedFile(null);
        
        // Refresh the file list
        if (!accessToken) return;
        const updatedFiles = await listDriveFiles(accessToken, folderId);
        setFolderFiles(updatedFiles);
        
        // Update brain visualization data
        if (updateBrainData) {
          updateBrainData(folders, expandedFolderId, updatedFiles);
        }
      } catch (error) {
        setMessage(`Error uploading file: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setUploading(false);
      }
    }
  };

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      // Safety cleanup in case component unmounts during resize
      if (isResizing) {
        setIsResizing(false);
        // Remove any lingering event listeners
        document.removeEventListener('mousemove', () => {});
        document.removeEventListener('mouseup', () => {});
      }
    };
  }, [isResizing]);

  return (
    <div className="relative flex" ref={sidebarRef}>
      <aside 
        className="bg-gray-900 p-6 h-screen rounded-xl shadow-xl flex flex-col gap-4 overflow-hidden"
        style={{ width: `${sidebarWidth}px` }}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Folders</h2>
        <button onClick={handleCreateFolder} className="text-green-400 hover:text-green-300 transition-all">
          <Plus size={20} />
        </button>
      </div>

      <input
        type="text"
        placeholder="New folder name"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        className="w-full p-2 bg-gray-800 text-white border border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
      />

      <ul className="space-y-2 overflow-y-auto flex-1">
        {folders.map((folder) => (
          <li key={folder.id}>
            <div
              onClick={() => handleFolderClick(folder.id)}
              className="p-3 flex items-center justify-between rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer transition-all"
            >
              <span className="flex items-center gap-2">
                <Folder size={18} />
                {folder.name}
              </span>
              <span>{expandedFolderId === folder.id ? "▼" : "▶"}</span>
            </div>

            {expandedFolderId === folder.id && (
              <div className="pl-4 mt-2 space-y-2">
                  <div 
                    className={`w-full flex flex-col items-center justify-center p-4 ${isDragging && activeDragFolderId === folder.id ? 'bg-blue-800 border-blue-500' : 'bg-gray-800 border-gray-700'} border-2 border-dashed rounded-lg text-white cursor-pointer hover:bg-gray-700 transition-all`}
                    onDragEnter={(e) => handleDragEnter(e, folder.id)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.id)}
                  >
                    <Upload size={24} className={`${isDragging && activeDragFolderId === folder.id ? 'text-blue-300' : 'text-gray-400'} mb-2`} />
                    <span className="text-sm mb-1">{isDragging && activeDragFolderId === folder.id ? 'Drop to upload' : 'Drag & drop files here'}</span>
                    <span className="text-xs text-gray-400">or</span>
                    <label className="mt-2 px-3 py-1 bg-gray-700 rounded-md hover:bg-gray-600 cursor-pointer text-sm">
                      Browse
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {selectedFile && (
                    <div className="mt-2 p-2 bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300 truncate max-w-[70%]">{selectedFile.name}</span>
                        <button
                          onClick={() => handleUpload(folder.id)}
                          className="flex items-center justify-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : "Upload"}
                        </button>
                      </div>
                    </div>
                  )}


                <ul>
  {folderFiles.map((file) => (
    <li key={file.id} className="relative flex items-center justify-between p-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg cursor-pointer">
      <div className="flex items-center gap-2 flex-grow" onClick={() => {
        console.log('File selected:', file.name, 'Type:', file.mimeType);
        onFileSelect(file.id, file.mimeType || null);
      }}>
        <FileText size={16} /> 
        <span className="truncate max-w-[120px]">{file.name}</span>
        {progressMessages[file.id] !== undefined && (
          <span className={`text-xs ${progressMessages[file.id] === 100 
            ? 'text-green-400' 
            : progressMessages[file.id] === -1 
            ? 'text-red-400' 
            : 'text-blue-400'}`}>
            {progressMessages[file.id] === -1 
              ? '(Failed)' 
              : `(${progressMessages[file.id]}%)`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleSummarizeFile(file.id, file.name)}
          className={`px-2 py-1 rounded-lg transition-all text-xs ${progressMessages[file.id] === 100 
            ? 'bg-green-600 text-white cursor-not-allowed' 
            : progressMessages[file.id] === -1
            ? 'bg-red-600 text-white cursor-not-allowed'
            : processingFiles.has(file.id)
            ? 'bg-blue-600 text-white'
            : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          disabled={processingFiles.has(file.id) || progressMessages[file.id] === 100 || completedSummarizations.includes(file.id) || summarizedFiles[file.id] === true || progressMessages[file.id] === -1}
          // Add key with timestamp to force re-render on every render cycle
          key={`summarize-${file.id}-${Date.now()}`}
        >
          {(() => {
            // Force evaluation of current state with fresh values
            // Use state directly rather than local variables to ensure we have the latest values
            const isProcessing = processingFiles.has(file.id);
            const progress = progressMessages[file.id] || 0;
            const isCompleted = completedSummarizations.includes(file.id);
            // Check if this file is directly marked as summarized in our state
            const isDirectlySummarized = summarizedFiles[file.id] === true;
            
            // Log the current state for debugging
            console.log(`RENDER: Button state for ${file.id}: processing=${isProcessing}, progress=${progress}, completed=${isCompleted}, directlySummarized=${isDirectlySummarized}, completedSummarizations=[${completedSummarizations.join(', ')}]`);
            
            // Force a refresh of the button state by accessing the updateCounter
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const forceRefresh = updateCounter;
            
            if (isProcessing) {
              return (
                <div className="flex items-center gap-1">
                  <Loader2 className="animate-spin w-3 h-3" />
                  <span>Summarizing</span>
                </div>
              );
            } else if (progress === 100 || isCompleted || completedSummarizations.includes(file.id) || summarizedFiles[file.id] === true) {
              return <span>Summarized</span>;
            } else if (progress === -1) {
              return <span>Failed</span>;
            } else {
              return <span>Summarize</span>;
            }
          })()}
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(file.id);
          }}
          className="p-1 text-gray-400 hover:text-red-400 transition-colors rounded-full hover:bg-gray-600"
          disabled={deletingFiles.has(file.id)}
          title="Delete file"
        >
          {deletingFiles.has(file.id) ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>
      
      {/* Delete confirmation popup */}
      {showDeleteConfirm === file.id && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 w-56">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle size={16} />
            <span>Delete this file?</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">This action cannot be undone.</p>
          <div className="flex justify-between gap-2">
            <button 
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(null);
              }}
            >
              Cancel
            </button>
            <button 
              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(file.id, file.name);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  ))}
</ul>
              </div>
            )}
          </li>
        ))}
      </ul>
      {message && <p className="text-sm text-gray-400 text-center">{message}</p>}
    </aside>
    {/* Minimal resize handle */}
    <div 
      className="absolute top-0 right-0 h-full cursor-ew-resize"
      style={{ width: '8px' }}
    >
      {/* Thin resize bar */}
      <div 
        className={`absolute top-0 bottom-0 left-1/2 -ml-0.5 w-1 flex flex-col items-center justify-center ${isResizing ? 'bg-blue-500' : 'bg-gray-500 hover:bg-blue-400'} transition-colors duration-150`}
        onMouseDown={handleMouseDown}
      >
        {/* Subtle grip dots */}
        <div className="flex flex-col h-16 justify-center gap-1.5 my-auto">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-0.5 h-2 bg-gray-300 rounded-full opacity-70" />
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}

// sendFileToServer function
async function sendFileToServer(file: Blob, fileName: string, uid: string, folderId: string) {
  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("uid", uid);
  formData.append("folderId", folderId);

  const response = await fetch("http://140.245.111.121:8051/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to server.");
  }

  return await response.json();
}