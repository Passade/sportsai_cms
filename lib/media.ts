import { config, ID, storage } from "./appwrite";
import { createCmsAuditLog } from "./cms";

export type CmsMediaFile = {
  $id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
  url: string;
  createdAt?: string;
};

export async function uploadCmsMediaFile(file: File) {
  if (!file) {
    throw new Error("No file selected.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }

  const maxSizeMb = 10;
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    throw new Error(`Image is too large. Max size is ${maxSizeMb}MB.`);
  }

  const uploadedFile = await storage.createFile(
    config.mediaBucketId,
    ID.unique(),
    file
  );

  const url = getCmsMediaFileUrl(uploadedFile.$id);

  await createCmsAuditLog({
    action: "upload",
    entityType: "media",
    entityId: uploadedFile.$id,
    entityTitle: file.name,
    message: `Uploaded media ${file.name}`,
    metadata: {
      mimeType: file.type,
      size: file.size,
      url,
    },
  });

  return {
    file: uploadedFile,
    url,
  };
}

export function getCmsMediaFileUrl(fileId: string) {
  return storage.getFileView(config.mediaBucketId, fileId).toString();
}

export async function listCmsMediaFiles() {
  const result = await storage.listFiles(config.mediaBucketId);

  return result.files.map((file) => ({
    $id: file.$id,
    name: file.name,
    mimeType: file.mimeType,
    sizeOriginal: file.sizeOriginal,
    createdAt: file.$createdAt,
    url: getCmsMediaFileUrl(file.$id),
  })) as CmsMediaFile[];
}

export async function deleteCmsMediaFile(fileId: string) {
  await storage.deleteFile(config.mediaBucketId, fileId);

  await createCmsAuditLog({
    action: "delete",
    entityType: "media",
    entityId: fileId,
    message: `Deleted media ${fileId}`,
  });

  return true;
}
