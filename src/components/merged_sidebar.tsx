"use client";
import { useEffect, useState, useRef, useCallback, MouseEvent as ReactMouseEvent, DragEvent } from "react";
import { listDriveFolders, listDriveFiles, deleteFile } from "@/lib/googleDrive";
import { getAuth } from "firebase/auth";
import { uploadFileToDrive, createDriveFolder } from "@/lib/googleDrive";
import { Loader2, Plus, Folder, FileText, Upload, Trash2, AlertCircle } from "lucide-react";

interface MergedSidebarUploadProps {
  onFileSelect: (fileId: string, fileType: string | null) => void;
  onToggleBrainView?: () => void;
}

export default function MergedSidebarUpload({ onFileSelect, onToggleBrainView }: MergedSidebarUploadProps) {
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<{ id: string; name: string; mimeType?: string }[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progressMessages, setProgressMessages] = useState<{ [key: string]: number }>({});
  const [processingFiles, setProcessingFiles] = useState(new Set<string>());
  // Add a state to track completed summarizations
  const [completedSummarizations, setCompletedSummarizations] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDragFolderId, setActiveDragFolderId] = useState<string | null>(null);
  const [deletingFiles, setDeletingFiles] = useState(new Set<string>());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(288); // 72 * 4 = 288px (w-72)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, expandedFolderId]);
  
  // Add effect to refresh file list when a summarization completes
  useEffect(() => {
    if (completedSummarizations.length > 0 && expandedFolderId && accessToken) {
      console.log("Refreshing files due to completed summarization in sidebar");
      listDriveFiles(accessToken, expandedFolderId).then(files => {
        setFolderFiles(files);
        console.log("Successfully refreshed files in sidebar after summarization");
      }).catch(error => {
        console.error("Error refreshing files in sidebar:", error);
      });
    }
  }, [completedSummarizations, expandedFolderId, accessToken]);

  // Create a ref for the WebSocket connection
  const wsRef = useRef<WebSocket | null>(null);

  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    console.log("Connecting to WebSocket in sidebar...");
    
    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    // Create a WebSocket connection for real-time progress updates
    const ws = new WebSocket("ws://140.245.111.121:8051/progress");
    wsRef.current = ws;
    
    // Handle connection opening
    ws.onopen = () => {
      console.log("WebSocket connection established in sidebar");
    };
    
    // Handle incoming messages
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fileId, progress, message } = data;
        
        console.log(`Progress Update: ${fileId} - ${progress}%`);
        
        // Force a state update to trigger re-render
        setProgressMessages((prev) => {
          const newState = { ...prev, [fileId]: progress };
          console.log("New progress state:", newState);
          return newState;
        });
        
        // If processing is complete (100%) OR failed (-1), clean up
        if ([100, -1].includes(progress)) {
          setProcessingFiles((prev) => {
            const newSet = new Set(prev);
            newSet.delete(fileId); // Remove from processing set
            console.log(`Removing file ${fileId} from processing set in sidebar, new set size: ${newSet.size}`);
            return newSet;
          });
          
          // Show completion message
          if (progress === 100) {
            setMessage(`Processing complete: ${fileId}`);
            setCompletedSummarizations(prev => [...prev, fileId]);
            
            // Refresh the file list if a folder is expanded
            if (expandedFolderId && accessToken) {
              console.log(`Refreshing files in folder ${expandedFolderId} after summarization`);
              listDriveFiles(accessToken, expandedFolderId).then(files => {
                setFolderFiles(files);
                console.log("Refreshed file list in sidebar after summarization completed");
              });
            }
          } else if (progress === -1) {
            setMessage(`Processing failed: ${fileId}`);
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error, event.data);
      }
    };
    
    // Handle errors
    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    // Handle connection closing
    wsRef.current.onclose = () => {
      console.log("WebSocket connection closed");
      // Try to reconnect after a delay
      setTimeout(() => {
        if (accessToken) {
          console.log("Attempting to reconnect WebSocket...");
          const newWs = new WebSocket("ws://140.245.111.121:8051/progress");
          wsRef.current = newWs;
          // Set up event handlers directly
          newWs.onopen = () => {
            console.log("WebSocket connection re-established in sidebar");
          };
          
          newWs.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { fileId, progress, message } = data;
              
              console.log(`Progress Update in sidebar: ${fileId} - ${progress}%`);
              
              // Update progress messages
              setProgressMessages((prev) => {
                const newState = { ...prev, [fileId]: progress };
                return newState;
              });
              
              // Handle completion
              if ([100, -1].includes(progress)) {
                setProcessingFiles((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(fileId);
                  console.log(`Removing file ${fileId} from processing set in sidebar, new set size: ${newSet.size}`);
                  return newSet;
                });
                
                if (progress === 100) {
                  setCompletedSummarizations(prev => [...prev, fileId]);
                }
              }
            } catch (error) {
              console.error("Error parsing WebSocket message in sidebar:", error);
            }
          };
          
          newWs.onerror = (error) => {
            console.error("WebSocket error in sidebar:", error);
          };
          
          newWs.onclose = (event) => {
            console.log("WebSocket connection closed in sidebar:", event.code, event.reason);
          };
        }
      }, 3000);
    };
    
    // This function is no longer needed as we're setting up handlers directly
    // on the WebSocket instance
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);
  
  // Establish WebSocket connection when component mounts
  useEffect(() => {
    console.log("Establishing WebSocket connection in sidebar...");
    connectWebSocket();
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectWebSocket]);
  
  
  

  const handleFolderClick = async (folderId: string) => {
    // Using expandedFolderId in this function
    if (expandedFolderId === folderId) {
      setExpandedFolderId(null);
      setFolderFiles([]);
    } else {
      if (!accessToken) return;
      const files = await listDriveFiles(accessToken, folderId);
      setExpandedFolderId(folderId);
      setFolderFiles(files);
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
        setFolders([...folders, { id: createdFolderId, name: newFolderName }]);
        setMessage(`Folder created successfully: ${newFolderName}`);
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
        setFolderFiles(prev => prev.filter(file => file.id !== fileId));
        setMessage(`File deleted: ${fileName}`);
        
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

  const handleProcessFile = async (fileId: string, fileName: string) => {
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
        const newState = { ...prev, [fileId]: 0 };
        console.log("Setting initial progress:", newState);
        return newState;
      });
      
      if (!accessToken) return;
      
      // Send processing request
      const response = await fetch("http://140.245.111.121:8051/process-file", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          uid,
          folderId,
          fileId,  // Make sure fileId is included
          filename: fileName,
          accessToken: accessToken,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Processing failed: ${errorText}`);
      }
      
      // Try to parse response for immediate feedback
      try {
        const responseData = await response.json();
        console.log("Process response:", responseData);
        
        // Show success message with any details from the server
        if (responseData.message) {
          setMessage(responseData.message);
        } else {
          setMessage(`Processing started: ${fileName}`);
        }
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const jsonError = error as Error;
        // If response isn't JSON, just show generic message
        setMessage(`Processing started: ${fileName}`);
      }
      
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
      
      // Reset progress
      setProgressMessages((prev) => {
        const newState = { ...prev };
        delete newState[fileId];
        return newState;
      });
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
        const files = await listDriveFiles(accessToken, folderId);
        setFolderFiles(files);
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
    <div className="relative flex h-full font-[var(--font-open-sans)]" ref={sidebarRef}>
      <aside 
        className="p-6 h-full flex flex-col gap-4 border-r border-gray-700"
        style={{ width: `${sidebarWidth}px` }}>
        <div className="overflow-y-auto flex-grow flex flex-col" style={{ height: 'calc(100% - 40px)' }}>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Folders</h2>
            <button 
              onClick={() => onToggleBrainView && onToggleBrainView()} 
              className="flex items-center justify-center px-2 py-1 bg-indigo-600 rounded-md hover:bg-indigo-500 transition-all"
              title="Brain Visualization"
            >
              <span className="text-white font-medium">🧠 Brain</span>
            </button>
          </div>
          <button onClick={handleCreateFolder} className="text-green-400 hover:text-green-300 transition-all">
            <Plus size={20} />
          </button>
        </div>
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
        {progressMessages[file.id] > 0 && (
          <span className={`text-xs ${progressMessages[file.id] === 100 ? 'text-green-400' : 'text-blue-400'}`}>
            ({progressMessages[file.id]}%)
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleProcessFile(file.id, file.name)}
          className={`px-2 py-1 rounded-lg transition-all text-xs ${progressMessages[file.id] === 100 
            ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          disabled={processingFiles.has(file.id) || progressMessages[file.id] === 100}
        >
          {processingFiles.has(file.id) ? (
            <div className="flex items-center gap-1">
              <Loader2 className="animate-spin w-3 h-3" />
              <span>Processing</span>
            </div>
          ) : progressMessages[file.id] === 100 ? (
            <span>Processed</span>
          ) : (
            <span>Process</span>
          )}
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
        </div>
    </aside>
    {/* Minimal resize handle */}
    <div 
      className="absolute top-0 right-0 h-full cursor-ew-resize"
      style={{ width: '8px' }}
    >
      {/* Thin resize bar */}
      <div 
        className={`absolute top-0 bottom-0 left-1/2 -ml-0.5 w-1 flex flex-col items-center justify-center ${isResizing ? 'bg-blue-500' : 'bg-gray-600 hover:bg-blue-400'} transition-colors duration-150`}
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