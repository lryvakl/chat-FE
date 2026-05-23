import http from './axios.instance';

export interface UploadResult {
  id: number;
  size: number;
}

export const mediaApi = {
  async upload(ciphertext: Uint8Array): Promise<UploadResult> {
    const form = new FormData();

    form.append(
      'file',
      new Blob([ciphertext as unknown as BlobPart], {
        type: 'application/octet-stream',
      }),
      'blob.bin',
    );

    const { data } = await http.post<UploadResult>('media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
  },

  async download(id: number): Promise<Uint8Array> {
    const { data } = await http.get<ArrayBuffer>(`media/${id}`, {
      responseType: 'arraybuffer',
    });
    return new Uint8Array(data);
  },
};
