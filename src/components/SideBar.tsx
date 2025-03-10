"use client";
import { useEffect, useState } from "react";
import { listDriveFolders, listDriveFiles } from "@/lib/googleDrive";

interface SidebarProps {
  onFileSelect: (fileId: string) => void;
}

export default function Sidebar({ onFileSelect }: SidebarProps) {
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<{ id: string; name: string }[]>([]);
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  // Fetch folders on component mount
  useEffect(() => {
    const fetchFolders = async () => {
      if (!accessToken) return;
      const folderList = await listDriveFolders();
      setFolders(folderList);
    };

    fetchFolders();
  }, [accessToken]);

  // Fetch files inside a folder when expanded
  const handleFolderClick = async (folderId: string) => {
    if (expandedFolderId === folderId) {
      // Collapse the folder if it's already expanded
      setExpandedFolderId(null);
      setFolderFiles([]);
    } else {
      // Expand the folder and fetch files
      if (!accessToken) return;
      const files = await listDriveFiles(accessToken, folderId);
      setExpandedFolderId(folderId);
      setFolderFiles(files);
    }
  };

  return (
    <aside className="w-64 bg-gray-800 p-6 h-[calc(100vh-2rem)] rounded-lg shadow-2xl m-4">
      <h2 className="text-xl font-bold mb-6">Folders</h2>
      <ul>
        {folders.map((folder) => (
          <li key={folder.id} className="mb-2">
            {/* Folder Name with Toggle */}
            <div
              onClick={() => handleFolderClick(folder.id)}
              className="p-3 hover:bg-gray-700 rounded-lg transition duration-300 cursor-pointer flex justify-between items-center border border-gray-600"
            >
              <span>{folder.name}</span>
              <span>{expandedFolderId === folder.id ? "▼" : "▶"}</span>
            </div>

            {/* Files inside the folder */}
            {expandedFolderId === folder.id && (
              <ul className="pl-4 mt-2">
                {folderFiles.map((file) => (
                  <li
                    key={file.id}
                    onClick={() => onFileSelect(file.id)}
                    className="p-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition duration-300 cursor-pointer border border-gray-500"
                  >
                    📄 {file.name}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}