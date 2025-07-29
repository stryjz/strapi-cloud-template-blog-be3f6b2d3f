import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload as UploadIcon, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth-client";

interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const Upload = () => {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const { toast } = useToast();
  const { data: session } = useSession();

  const handleFileSelect = useCallback((files: FileList) => {
    const maxFileSize = 500 * 1024 * 1024; // 500MB
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    Array.from(files).forEach(file => {
      if (file.size > maxFileSize) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Files too large",
        description: `The following files exceed the 500MB limit: ${invalidFiles.join(', ')}`,
        variant: "destructive",
      });
    }
    
    const newUploads: FileUpload[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: "pending"
    }));
    
    setUploads(prev => [...prev, ...newUploads]);
  }, [toast]);

  const uploadFile = useCallback(async (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (!upload) return;

    setUploads(prev => prev.map(upload => 
      upload.id === uploadId 
        ? { ...upload, status: "uploading" as const }
        : upload
    ));

    try {
      const token = session?.session?.id;
      if (!token) {
        throw new Error('No session token');
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = (e.target?.result as string).split(',')[1];
          
          const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileName: upload.file.name,
              fileData: base64Data,
              contentType: upload.file.type,
            }),
          });

          if (!response.ok) {
            let errorMessage = 'Upload failed';
            try {
              const error = await response.json();
              errorMessage = error.message || error.error || 'Upload failed';
            } catch (parseError) {
              // If response is not JSON, use status text
              errorMessage = response.statusText || 'Upload failed';
            }
            throw new Error(errorMessage);
          }

          const result = await response.json();
          
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, progress: 100, status: "completed" as const }
              : upload
          ));

          toast({
            title: "Upload completed",
            description: `${upload.file.name} has been uploaded successfully.`,
          });
        } catch (error) {
          console.error('Upload error:', error);
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: "error" as const, error: error instanceof Error ? error.message : 'Upload failed' }
              : upload
          ));
          
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
            variant: "destructive",
          });
        }
      };

      reader.onerror = () => {
        setUploads(prev => prev.map(upload => 
          upload.id === uploadId 
            ? { ...upload, status: "error" as const, error: "Failed to read file" }
            : upload
        ));
      };

      reader.readAsDataURL(upload.file);
    } catch (error) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map(upload => 
        upload.id === uploadId 
          ? { ...upload, status: "error" as const, error: error instanceof Error ? error.message : 'Upload failed' }
          : upload
      ));
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  }, [uploads, session, toast]);

  const removeUpload = useCallback((uploadId: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== uploadId));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadAllPending = useCallback(() => {
    const pendingUploads = uploads.filter(u => u.status === "pending");
    pendingUploads.forEach(upload => uploadFile(upload.id));
  }, [uploads, uploadFile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Files</h1>
        <p className="text-muted-foreground">
          Upload your files to secure cloud storage
        </p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Drop Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
          >
            <UploadIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Drop files here</h3>
            <p className="text-muted-foreground mb-4">
              or click to browse your computer
            </p>
            <input
              type="file"
              multiple
              className="hidden"
              id="file-upload"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Browse Files
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {uploads.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upload Queue</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={uploadAllPending}
              disabled={!uploads.some(u => u.status === "pending")}
            >
              Upload All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploads.map((upload) => (
                <div key={upload.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{upload.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(upload.file.size)}
                    </p>
                    {upload.status === "uploading" && (
                      <Progress value={upload.progress} className="mt-2" />
                    )}
                    {upload.status === "error" && upload.error && (
                      <p className="text-sm text-destructive mt-1">{upload.error}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      upload.status === "completed" ? "default" :
                      upload.status === "uploading" ? "secondary" :
                      upload.status === "error" ? "destructive" : "outline"
                    }>
                      {upload.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {upload.status === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
                      {upload.status}
                    </Badge>
                    {upload.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => uploadFile(upload.id)}
                      >
                        Upload
                      </Button>
                    )}
                    {upload.status === "error" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => uploadFile(upload.id)}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(upload.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};