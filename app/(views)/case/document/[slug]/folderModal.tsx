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
import { useState, useEffect } from "react";
import Routes from "@/Routes.json";
import axios from "axios";

import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { File, CheckCircle, AlertCircle, Pause, Play } from "lucide-react";
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

  const handleClose = () => {
    setModalState({ open: false });
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
    const fileState = fileStates[fileIndex];
    if (!fileState || fileState.isPaused) return;

    try {
      updateFileState(fileIndex, { status: "uploading", error: undefined });

      // Start upload if not already started
      if (!fileState.uploadId) {
        const uploadData = await startUploadingFile(fileState.file.name);
        updateFileState(fileIndex, { uploadId: uploadData.uploadId });
        fileState.uploadId = uploadData.uploadId;
      }

      const file = fileState.file;
      const totalParts = Math.ceil(file.size / CHUNK_SIZE);

      updateFileState(fileIndex, { totalParts });

      // Keep track of parts in local variable to avoid state update issues
      let uploadedParts = [...fileState.parts];

      // Upload chunks starting from current part
      for (
        let partNumber = fileState.currentPart;
        partNumber <= totalParts;
        partNumber++
      ) {
        // Check if paused by getting fresh state
        const currentState = fileStates[fileIndex];
        if (currentState.isPaused) {
          updateFileState(fileIndex, { status: "paused" });
          return;
        }

        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const chunkResult = await uploadChunk(
          file.name,
          fileState.uploadId!,
          partNumber,
          chunk
        );

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

      // Complete the upload with the local parts array
      console.log("Completing upload with parts:", uploadedParts);
      await completeUpload(file.name, fileState.uploadId!, uploadedParts);

      updateFileState(fileIndex, {
        status: "completed",
        progress: 100,
      });
    } catch (error) {
      console.error("Upload error:", error);
      updateFileState(fileIndex, {
        status: "error",
        error: error.response?.data?.message || "Upload failed",
      });
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
  };

  const pauseUpload = (index: number) => {
    updateFileState(index, { isPaused: true, status: "paused" });
  };

  const resumeUpload = async (index: number) => {
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
  };

  const removeFile = (index: number) => {
    setFileStates((prev) => prev.filter((_, i) => i !== index));
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
        <DialogContent className="sm:max-w-[800px]">
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
                  onClick={() => setFileStates([])}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FilesModal;
