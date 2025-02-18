"use client";

import { useState, useEffect } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Download, History } from "lucide-react";
import { useToast } from "../components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

interface ProcessingStatus {
  step: string;
  status: "pending" | "processing" | "completed" | "error";
  message: string;
}

export default function FeedData() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStatus[]>([]);
  const [backupUrl, setBackupUrl] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ exists: boolean; lastModified: string | null }>({
    exists: false,
    lastModified: null
  });
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkCacheFolder();
  }, []);

  const checkCacheFolder = async () => {
    try {
      const response = await fetch('/api/check-cache');
      const data = await response.json();
      setCacheInfo(data);
    } catch (error) {
      console.error('Failed to check cache folder:', error);
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBackupFile(e.target.files[0]);
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      toast({
        title: "No backup file selected",
        description: "Please select a backup file to restore.",
        variant: "destructive",
      });
      return;
    }

    setIsRestoringBackup(true);
    try {
      const formData = new FormData();
      formData.append("backup", backupFile);

      const response = await fetch("/api/restore-backup", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore backup");
      }

      toast({
        title: "Success!",
        description: "Backup has been restored successfully.",
      });
      
      // Refresh cache folder info
      await checkCacheFolder();
      setBackupFile(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const updateProcessingStep = (
    step: string,
    status: ProcessingStatus["status"],
    message: string
  ) => {
    setProcessingSteps((prev) => {
      const existing = prev.findIndex((s) => s.step === step);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = { step, status, message };
        return updated;
      }
      return [...prev, { step, status, message }];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      // Reset states when new files are selected
      setProcessingSteps([]);
      setBackupUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
      // Reset states when new files are dropped
      setProcessingSteps([]);
      setBackupUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const downloadBackup = async () => {
    if (!backupUrl) return;

    try {
      updateProcessingStep(
        "download",
        "processing",
        "Downloading backup..."
      );

      const response = await fetch(backupUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'backup.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      updateProcessingStep(
        "download",
        "completed",
        "Backup downloaded successfully"
      );
    } catch (error) {
      updateProcessingStep(
        "download",
        "error",
        "Failed to download backup"
      );
      toast({
        title: "Download Failed",
        description: "Failed to download the backup file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one document to process.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingSteps([]);
    setBackupUrl(null);

    try {
      // Step 1: Upload files
      updateProcessingStep(
        "upload",
        "processing",
        "Uploading documents..."
      );

      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      // Immediately show upload complete status
      updateProcessingStep(
        "upload",
        "completed",
        "Documents uploaded successfully"
      );

      // Step 2: Start processing
      updateProcessingStep(
        "process",
        "processing",
        "Processing documents..."
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to process documents");
      }

      // Update processing status
      updateProcessingStep(
        "process",
        "completed",
        "Documents processed successfully"
      );

      // Step 3: Handle backup
      updateProcessingStep(
        "backup",
        "processing",
        "Creating backup..."
      );

      if (data.backupUrl) {
        setBackupUrl(data.backupUrl);
        updateProcessingStep(
          "backup",
          "completed",
          "Backup is ready for download"
        );
      } else {
        updateProcessingStep(
          "backup",
          "error",
          "Backup creation failed, but documents were processed"
        );
      }

      toast({
        title: "Success!",
        description: "Documents have been processed successfully.",
      });
      setFiles([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      const currentStep = processingSteps[processingSteps.length - 1]?.step || "process";
      
      updateProcessingStep(
        currentStep,
        "error",
        `Error: ${errorMessage}`
      );

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepIcon = (status: ProcessingStatus["status"]) => {
    switch (status) {
      case "processing":
        return <Loader2 className="animate-spin h-5 w-5" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Document Management</h1>
      
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="feed">Feed Documents</TabsTrigger>
          <TabsTrigger value="restore">Restore Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <div className="space-y-6">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-600">
                  Drag and drop your documents here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to select files
                </p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 space-y-3">
                <h3 className="font-semibold text-gray-700">Selected Files:</h3>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 text-gray-600">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span>{file.name}</span>
                  </div>
                ))}
              </div>
            )}

            {processingSteps.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 space-y-3">
                <h3 className="font-semibold text-gray-700">Processing Status:</h3>
                {processingSteps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3 text-gray-600">
                    {getStepIcon(step.status)}
                    <span className={
                      step.status === "completed" ? "text-green-600" :
                      step.status === "error" ? "text-red-600" :
                      "text-gray-600"
                    }>{step.message}</span>
                  </div>
                ))}
              </div>
            )}

            {backupUrl && (
              <button
                onClick={downloadBackup}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 bg-blue-50 p-3 rounded-lg w-full justify-center transition-colors"
              >
                <Download className="h-5 w-5" />
                <span>Download Backup</span>
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={isProcessing || files.length === 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isProcessing ? "Processing..." : "Process Documents"}
            </button>
          </div>
        </TabsContent>

        <TabsContent value="restore">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Cache Folder Status</h3>
              <div className="flex items-center space-x-2 text-gray-600">
                <History className="h-5 w-5 text-blue-500" />
                <span>
                  {cacheInfo.exists 
                    ? `Cache folder exists - Last modified: ${cacheInfo.lastModified}`
                    : "No cache folder found"}
                </span>
              </div>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <input
                type="file"
                accept=".zip"
                onChange={handleBackupFileChange}
                className="hidden"
                id="backup-upload"
              />
              <label htmlFor="backup-upload" className="cursor-pointer block">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-600">
                  Click to select backup file
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  (.zip files only)
                </p>
              </label>
            </div>

            {backupFile && (
              <div className="bg-white rounded-lg shadow p-4 space-y-3">
                <h3 className="font-semibold text-gray-700">Selected Backup:</h3>
                <div className="flex items-center space-x-2 text-gray-600">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span>{backupFile.name}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleRestoreBackup}
              disabled={isRestoringBackup || !backupFile}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isRestoringBackup ? "Restoring..." : "Restore Backup"}
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
