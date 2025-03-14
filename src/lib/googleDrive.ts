import axios from "axios";
import { auth } from "@/lib/firebaseConfig";
/**
 * Creates a new folder in Google Drive.
 * @param folderName The name of the folder to create.
 * @returns The ID of the created folder.
 */
// These imports are not used directly in this file but are exported for use elsewhere
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getAuth } from "firebase/auth";

const isUserAuthenticated = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe(); // Stop listening after checking
      if (user) {
        resolve(user); // ✅ User is signed in
      } else {
        reject("User is not signed in."); // ❌ User is not authenticated
      }
    });
  });
};

// This function is exported but not used directly in this file
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getAccessToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("User is not authenticated.");

  return user.getIdToken(true); // Force refresh
}

export const createDriveFolder = async (folderName: string) => {
    await isUserAuthenticated(); // ✅ Check if user is signed in
    const accessToken = localStorage.getItem("accessToken");
    console.log(accessToken)
    if (!accessToken) {
      console.error("No access token found");
      return;
    }
  
    const response = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName, // User-defined folder name
        mimeType: "application/vnd.google-apps.folder",
      }),
    });
  
    const data = await response.json();
    console.log("Created Folder:", data);
    return data.id; // Return the folder ID
  };
  

/**
 * Uploads a file to Google Drive, optionally inside a specified folder.
 * @param file The file to upload.
 * @param folderId (Optional) The ID of the folder where the file should be uploaded.
 */
export const uploadFileToDrive = async (file: File, folderId?: string) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      console.error("No access token found");
      return;
    }
  
    const metadata = {
      name: file.name,
      parents: [folderId], // Upload inside this folder
    };
  
    const formData = new FormData();
    formData.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    formData.append("file", file);
  
    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );
  
    const data = await response.json();
    console.log("Uploaded File:", data);
};

export const listDriveFolders = async () => {
  try {
    // First check if user is authenticated
    await isUserAuthenticated();
    
    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    // Get a fresh token directly from Firebase instead of localStorage
    // This ensures we have a valid, non-expired token
    const idToken = await user.getIdToken(true); // Force refresh the token
    
    // Get OAuth token from localStorage as fallback
    const accessToken = localStorage.getItem("accessToken");
    
    // Use the appropriate token (prefer OAuth token if available)
    const token = accessToken || idToken;
    
    console.log("Using token for Drive API request"); // Don't log the actual token
    
    const response = await axios.get(
      "https://www.googleapis.com/drive/v3/files",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
          fields: "files(id, name)",
        },
      }
    );

    return response.data.files;
  } catch (error) {
    console.error("Error fetching folders:", error);
    // If we get a 401 error, the token might be expired
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.error("Authentication error: Token may be expired or invalid");
      // Clear the invalid token
      localStorage.removeItem("accessToken");
    }
    return [];
  }
};


  export async function listDriveFiles(accessToken: string, folderId: string) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType)&access_token=${accessToken}`
    );
    const data = await response.json();
    return data.files || [];
  }
  
  export async function getFileContent(accessToken: string, fileId: string, isBinary: boolean = false) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  
    if (!response.ok) {
      throw new Error("Failed to fetch file content.");
    }
  
    return isBinary ? await response.arrayBuffer() : await response.text();
  }
  
  /**
   * Deletes a file from Google Drive.
   * @param accessToken The access token for authentication.
   * @param fileId The ID of the file to delete.
   * @returns A boolean indicating whether the deletion was successful.
   */
  export async function deleteFile(accessToken: string, fileId: string) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
      return response.ok;
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new Error("Failed to delete file.");
    }
  }
  