export interface UploadFile {
  name: string;
  size: number;
  type: string;
  url: string;
}

/**
 * Upload a single image file to the local server
 * @param file Image file to upload
 * @returns Upload result with relative URL path
 */
export async function uploadImage(file: File): Promise<UploadFile> {
  const formData = new FormData();
  formData.append('file', file);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await fetch(`${apiUrl}/api/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
}

/**
 * Upload multiple image files sequentially
 * @param files Array of image files
 * @returns Array of upload results
 */
export async function uploadFiles(files: File[]): Promise<UploadFile[]> {
  const results: UploadFile[] = [];
  for (const file of files) {
    results.push(await uploadImage(file));
  }
  return results;
}

/**
 * Resolve an image URL for display
 * @param url File URL (relative path or absolute URL)
 * @returns Full image URL ready for display
 */
export function getImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${apiUrl}${url}`;
}
