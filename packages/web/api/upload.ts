export interface UploadFile {
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface UploadResponse {
  files: UploadFile[];
}

/**
 * 上传图片文件到 CDN
 * @param file 图片文件
 * @returns 上传结果
 */
export async function uploadImage(file: File): Promise<UploadFile> {
  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch('/api/uploads', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    }
  });

  if (!response.ok) {
    throw new Error('Failed to upload files');
  }

  const data = await response.json();
  
  // 从响应中提取文件信息
  const uploadedFiles = data.files.map((f: any) => {
    const url = f.urls.r2 || Object.values(f.urls)[0] || '';
    return { name: f.name, size: f.size, type: f.type, url };
  });

  // 返回第一个上传的文件
  return uploadedFiles[0];
}

/**
 * 批量上传图片文件到 CDN
 * @param files 图片文件数组
 * @returns 上传结果
 */
export async function uploadFiles(files: File[]): Promise<UploadFile[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  const response = await fetch('/api/uploads', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload files');
  }

  const data = await response.json();
  
  // 从响应中提取文件信息
  return data.files.map((f: any) => {
    const url = f.urls.r2 || Object.values(f.urls)[0] || '';
    return { name: f.name, size: f.size, type: f.type, url };
  });
}

/**
 * 获取图片 URL
 * @param url 文件 URL（可能是 CDN 地址或相对路径）
 * @returns 完整的图片 URL
 */
export function getImageUrl(url: string): string {
  // 如果已经是完整 URL（包括 CDN 地址），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 如果是相对路径，拼接 API 地址（向后兼容）
  if (url.startsWith('/api/upload/image/')) {
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${url}`;
  }
  
  // 否则拼接完整路径（向后兼容）
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/upload/image/${url}`;
}

