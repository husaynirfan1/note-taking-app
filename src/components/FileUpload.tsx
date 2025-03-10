"use client";
import { useState } from "react";
import { getAuth } from "firebase/auth";
import { uploadFileToDrive, createDriveFolder } from "@/lib/googleDrive";

export default function FileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setMessage(null); // Clear any previous messages
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
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
      // Create folder in Google Drive
      const createdFolderId = await createDriveFolder(folderName);
      if (createdFolderId) {
        setFolderId(createdFolderId);
        setMessage(`Folder created successfully: ${folderName}`);
      }

      // Send folder creation request to FastAPI server
      const response = await fetch("http://140.245.111.121:8051/create-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folderName, uid, folderId: createdFolderId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create folder on server.");
      }

      const result = await response.json();
      setMessage(`Folder created and synced: ${folderName}`);
    } catch (error) {
      // Handle unknown error type
      if (error instanceof Error) {
        setMessage(`Error creating folder: ${error.message}`);
      } else {
        setMessage(`Error creating folder: ${String(error)}`);
      }
    }
  };

  const handleUpload = async () => {
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
      // Upload file to Google Drive
      await uploadFileToDrive(selectedFile, folderId || undefined);
      setMessage(`File uploaded to Google Drive: ${selectedFile.name}`);

      // Send file to FastAPI server
      const response = await sendFileToServer(selectedFile, selectedFile.name, uid);
      setMessage(`File uploaded to Google Drive and server: ${selectedFile.name}`);
    } catch (error) {
      // Handle unknown error type
      if (error instanceof Error) {
        setMessage(`Error uploading file: ${error.message}`);
      } else {
        setMessage(`Error uploading file: ${String(error)}`);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
      <h3 className="text-xl font-bold mb-6">Upload Files</h3>

      {/* Folder Creation Section */}
      <div className="mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Enter folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleCreateFolder}
            className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition duration-300"
            disabled={uploading}
          >
            Create Folder
          </button>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="mb-6">
        <input
          type="file"
          onChange={handleFileChange}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          disabled={uploading}
        />
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300"
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Upload to Google Drive and Server"}
      </button>

      {/* Message Display */}
      {message && (
        <p className="mt-4 text-sm text-gray-300 text-center">{message}</p>
      )}
    </div>
  );
}

// sendFileToServer function
async function sendFileToServer(file: Blob, fileName: string, uid: string) {
  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("uid", uid); // Send UID along with the file

  const response = await fetch("http://140.245.111.121:8051/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to server.");
  }

  return await response.json(); // Handle server response
}