type Upload = {
  transferId: string;
  path: string;
  name: string;
  file: File | null;
  type: ResourceType;
  overwrite: boolean;
  totalBytes: number;
  sentBytes: number;
  createdAt: number;
  speedBytesPerSecond: number;
  rawProgress: {
    sentBytes: number;
    sampledAt: number;
  };
};

interface UploadEntry {
  name: string;
  size: number;
  isDir: boolean;
  fullPath?: string;
  to?: string;
  file?: File;
  overwrite?: boolean;
}

type UploadList = UploadEntry[];
