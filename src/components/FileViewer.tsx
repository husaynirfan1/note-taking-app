"use client";
import { useEffect, useState } from "react";
import { getFileContent } from "@/lib/googleDrive";
import { Loader } from "lucide-react";

interface FileViewerProps {
  fileId: string | null;
  accessToken: string | null;
  fileType: string | null;
}

export default function FileViewer({ fileId, accessToken, fileType }: FileViewerProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when file changes
    setFileContent(null);
    setPdfFile(null);
    setError(null);
    
    const fetchFileContent = async () => {
      console.log('FileViewer useEffect - Props:', { fileId, accessToken, fileType });
      if (!fileId || !accessToken) {
        console.log('Missing required props:', { fileId, accessToken });
        return;
      }
      setIsLoading(true);
      try {
        console.log('Processing file with type:', fileType);
        // Default to text content if fileType is null
        if (!fileType || fileType === 'null') {
          console.log('No file type specified, defaulting to text');
          const content = await getFileContent(accessToken, fileId);
          console.log('Content received:', typeof content);
          if (typeof content === 'string') {
            setFileContent(content);
          } else {
            throw new Error('Received non-string content for text file');
          }
        } else if (fileType === "application/pdf") {
          console.log('Fetching PDF content...');
          const pdfBlob = await getFileContent(accessToken, fileId, true);
          console.log('PDF blob received:', pdfBlob);
          // Convert ArrayBuffer to Blob and create URL
          if (pdfBlob instanceof ArrayBuffer) {
            console.log('Creating Blob from ArrayBuffer...');
            const blob = new Blob([pdfBlob], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            console.log('Created URL for PDF:', url);
            setPdfFile(url);
          } else {
            throw new Error('Expected ArrayBuffer but got: ' + typeof pdfBlob);
          }
        } else if (fileType.includes("text") || fileType.includes("json")) {
          console.log('Fetching text content...');
          const content = await getFileContent(accessToken, fileId);
          console.log('Text content received:', typeof content, typeof content === 'string' ? content.substring(0, 100) : 'Non-string content');
          if (typeof content === 'string') {
            setFileContent(content);
          } else {
            console.error('Expected string but got:', typeof content);
          }
        } else {
          setFileContent("Unsupported file type.");
        }
      } catch (error) {
        console.error("Failed to fetch file content:", error);
        setError(error instanceof Error ? error.message : 'Error loading file content');
        setFileContent(null);
        setPdfFile(null);
      } finally {
        setIsLoading(false);
        console.log('File loading complete. States:', { 
          fileContent: fileContent ? 'Has content' : 'No content', 
          pdfFile: pdfFile ? 'Has PDF URL' : 'No PDF URL',
          error,
          isLoading
        });
      }
    };

    fetchFileContent();
  }, [fileId, accessToken, fileType]);

  if (!fileId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a file to view its content.
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-xl max-w-3xl mx-auto text-white min-h-[300px]">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
          <Loader className="animate-spin text-blue-500" size={36} />
          <span>Loading file content...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full text-red-400 gap-4">
          <span>Error: {error}</span>
        </div>
      ) : fileType === "application/pdf" && pdfFile ? (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div className="w-full h-[600px] max-w-3xl mx-auto rounded-lg overflow-hidden shadow-lg">
            <iframe 
              src={pdfFile} 
              className="w-full h-full border-0"
              title="PDF Viewer"
            />
          </div>
        </div>
      ) : fileContent ? (
        <pre className="whitespace-pre-wrap text-sm text-gray-100">{fileContent}</pre>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          No content to display
        </div>
      )}
    </div>
  );
}
