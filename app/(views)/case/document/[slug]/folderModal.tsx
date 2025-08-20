import FormInput from "@/components/form/formInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DocuemntDTO } from "@/Schemas/document/document.DTO";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormProvider, useForm } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import Routes from "@/Routes.json";
import axios from "axios";

import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  File,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
  ExternalLink,
  Loader,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FilesModalProps {
  modalState: {
    open: boolean;
    data?: any;
  };
  setModalState: (state: { open: boolean; data?: any }) => void;
}

interface FileUploadState {
  file: File;
  status: "pending" | "uploading" | "paused" | "completed" | "error";
  progress: number;
  uploadId?: string;
  parts: Array<{ ETag: string; PartNumber: number }>;
  currentPart: number;
  totalParts: number;
  error?: string;
  isPaused: boolean;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

const FilesModal = ({ modalState, setModalState }: FilesModalProps) => {
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [oldFiles, setOldFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  // Use refs to store current file states for real-time access in async functions
  const fileStatesRef = useRef<FileUploadState[]>([]);
  const pauseFlags = useRef<boolean[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    fileStatesRef.current = fileStates;
    pauseFlags.current = fileStates.map((state) => state.isPaused);
  }, [fileStates]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${Routes.document}/${modalState?.data?.id}`
      );
      setOldFiles(data.File);
    } catch (error) {}
    setLoading(false);
  };

  useEffect(() => {
    if (modalState?.data?.id) {
      fetchFiles();
    }
  }, [modalState?.data?.id]);

  const handleClose = () => {
    setModalState({ open: false });
  };

  const handleFileClick = (fileLink) => {
    window.open(fileLink, "_blank");
  };

  const updateFileState = (
    index: number,
    updates: Partial<FileUploadState>
  ) => {
    setFileStates((prev) =>
      prev.map((state, i) => (i === index ? { ...state, ...updates } : state))
    );
  };

  const startUploadingFile = async (fileName: string) => {
    try {
      const { data } = await axios.post(Routes.fileUpload.startUpload, {
        name: fileName,
      });
      return data;
    } catch (error) {
      console.error("Error starting upload:", error);
      throw error;
    }
  };

  const uploadChunk = async (
    objectName: string,
    uploadId: string,
    partNumber: number,
    chunk: Blob
  ) => {
    const formData = new FormData();
    formData.append("file", chunk);
    formData.append("objectName", objectName);
    formData.append("uploadId", uploadId);
    formData.append("partNumber", partNumber.toString());

    const { data } = await axios.post(Routes.fileUpload.upload, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  };

  const completeUpload = async (
    objectName: string,
    uploadId: string,
    parts: Array<{ ETag: string; PartNumber: number }>
  ) => {
    const { data } = await axios.post(Routes.fileUpload.completeUpload, {
      objectName,
      uploadId,
      parts,
      documentId: modalState?.data?.id,
    });
    return data;
  };

  const uploadSingleFile = async (fileIndex: number) => {
    // Get current file state from ref for real-time data
    const fileState = fileStatesRef.current[fileIndex];
    if (!fileState) return;

    try {
      updateFileState(fileIndex, { status: "uploading", error: undefined });

      // Start upload if not already started
      if (!fileState.uploadId) {
        const uploadData = await startUploadingFile(fileState.file.name);
        updateFileState(fileIndex, { uploadId: uploadData.uploadId });
        // Update the ref as well
        fileStatesRef.current[fileIndex] = {
          ...fileStatesRef.current[fileIndex],
          uploadId: uploadData.uploadId,
        };
      }

      const file = fileState.file;
      const totalParts = Math.ceil(file.size / CHUNK_SIZE);

      updateFileState(fileIndex, { totalParts });

      // Keep track of parts in local variable to avoid state update issues
      let uploadedParts = [...fileState.parts];
      const currentUploadId =
        fileState.uploadId || fileStatesRef.current[fileIndex].uploadId;

      // Upload chunks starting from current part
      for (
        let partNumber = fileState.currentPart;
        partNumber <= totalParts;
        partNumber++
      ) {
        // Check pause flag using ref for real-time status
        if (pauseFlags.current[fileIndex]) {
          updateFileState(fileIndex, { status: "paused" });
          return;
        }

        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const chunkResult = await uploadChunk(
          file.name,
          currentUploadId!,
          partNumber,
          chunk
        );

        // Check again after async operation
        if (pauseFlags.current[fileIndex]) {
          updateFileState(fileIndex, { status: "paused" });
          return;
        }

        // Update local parts array
        uploadedParts[partNumber - 1] = {
          ETag: chunkResult.ETag,
          PartNumber: partNumber,
        };

        const progress = (partNumber / totalParts) * 100;

        updateFileState(fileIndex, {
          parts: uploadedParts,
          currentPart: partNumber + 1,
          progress,
        });
      }

      // Final check before completing
      if (pauseFlags.current[fileIndex]) {
        updateFileState(fileIndex, { status: "paused" });
        return;
      }

      // Complete the upload with the local parts array
      console.log("Completing upload with parts:", uploadedParts);
      await completeUpload(file.name, currentUploadId!, uploadedParts);

      updateFileState(fileIndex, {
        status: "completed",
        progress: 100,
      });
    } catch (error) {
      console.error("Upload error:", error);
      pauseUpload(fileIndex);
      updateFileState(fileIndex, { isPaused: true, status: "paused" });
      // updateFileState(fileIndex, {
      //   status: "error",
      //   error: error.response?.data?.message || "Upload failed",
      // });
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);

    // Upload files sequentially
    for (let i = 0; i < fileStates.length; i++) {
      if (
        fileStates[i].status === "pending" ||
        fileStates[i].status === "paused"
      ) {
        await uploadSingleFile(i);
      }
    }

    setIsUploading(false);
    fetchFiles();
  };

  const pauseUpload = (index: number) => {
    pauseFlags.current[index] = true;
    updateFileState(index, { isPaused: true, status: "paused" });
  };

  const resumeUpload = async (index: number) => {
    pauseFlags.current[index] = false;
    updateFileState(index, { isPaused: false });
    await uploadSingleFile(index);
  };

  const onDrop = (acceptedFiles: File[]) => {
    const newFileStates = acceptedFiles.map((file) => ({
      file,
      status: "pending" as const,
      progress: 0,
      parts: [],
      currentPart: 1,
      totalParts: Math.ceil(file.size / CHUNK_SIZE),
      isPaused: false,
    }));

    setFileStates((prev) => [...prev, ...newFileStates]);

    pauseFlags.current = [
      ...pauseFlags.current,
      ...newFileStates.map(() => false),
    ];
  };

  const removeFile = (index: number) => {
    setFileStates((prev) => prev.filter((_, i) => i !== index));

    pauseFlags.current = pauseFlags.current.filter((_, i) => i !== index);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="text-green-500" size={16} />;
      case "error":
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return <File size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "uploading":
        return "text-blue-600";
      case "paused":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <Dialog
        open={modalState.open}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setModalState({ open, data: modalState.data });
          }
        }}
      >
        <DialogContent className="min-w-[900px] w-full h-[600px] overflow-y-auto">
          <div>
            <h1 className="text-1xl font-bold tracking-tight mb-2">
              Files for document: {modalState?.data?.name}
            </h1>
          </div>
          <div>
            <Dropzone
              accept={{ "*": [] }}
              maxFiles={10}
              maxSize={1024 * 1024 * 100} // 100MB max
              minSize={1024}
              onDrop={onDrop}
              onError={console.error}
              src={fileStates.map((state) => state.file)}
            >
              <DropzoneEmptyState />
              <DropzoneContent />
            </Dropzone>

            <div className="mt-4 space-y-2">
              {fileStates.map((fileState, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(fileState.status)}
                          <span className="font-medium">
                            {fileState.file.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({formatFileSize(fileState.file.size)})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm ${getStatusColor(
                              fileState.status
                            )}`}
                          >
                            {fileState.status.charAt(0).toUpperCase() +
                              fileState.status.slice(1)}
                          </span>

                          {fileState.status === "uploading" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pauseUpload(index)}
                            >
                              <Pause size={14} />
                            </Button>
                          )}

                          {fileState.status === "paused" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resumeUpload(index)}
                            >
                              <Play size={14} />
                            </Button>
                          )}

                          {fileState.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFile(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>

                      {(fileState.status === "uploading" ||
                        fileState.status === "paused") && (
                        <div className="space-y-1">
                          <Progress
                            value={fileState.progress}
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>
                              Part {fileState.currentPart - 1} of{" "}
                              {fileState.totalParts}
                            </span>
                            <span>{Math.round(fileState.progress)}%</span>
                          </div>
                        </div>
                      )}

                      {fileState.status === "error" && (
                        <p className="text-sm text-red-600">
                          {fileState.error}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {fileStates.length > 0 && (
              <div className="mt-4 flex space-x-2">
                <Button
                  onClick={handleUpload}
                  disabled={
                    isUploading ||
                    fileStates.every((f) => f.status === "completed")
                  }
                >
                  {isUploading ? "Uploading..." : "Upload All"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setFileStates([]);
                    pauseFlags.current = [];
                  }}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
          <hr />
          <center>
            Saved Files
            {loading && (
              <center className="mt-5">
                <Loader />
              </center>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 center">
              {!loading &&
                oldFiles?.map((file) => {
                  const displayName =
                    file.name.length > 15
                      ? file.name.slice(0, 15) + "..."
                      : file.name;

                  return (
                    <Card
                      key={file.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50 border border-gray-200"
                      onClick={() => handleFileClick(file.fileLink)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center gap-3">
                            <span>{displayName}</span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm text-gray-600">
                            <span>Type:</span>
                            <span className="font-medium">
                              {file.contentType}
                            </span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Click to open file
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </center>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FilesModal;
