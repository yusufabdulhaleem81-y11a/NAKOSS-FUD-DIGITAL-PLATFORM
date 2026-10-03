import { api } from '@/lib/api';

export interface AlbumListItem { id: string; title: string; description: string | null; coverImageUrl: string | null; photoCount: number; createdAt: string }
export interface AlbumDetail { id: string; title: string; description: string | null; createdAt: string; photos: { id: string; url: string; caption: string | null }[] }
export interface MyAlbum { id: string; title: string; description: string | null; isPublished: boolean; createdAt: string }

export const galleryService = {
  async publicAlbums(): Promise<AlbumListItem[]> { return api.get('/api/public/gallery'); },
  async album(id: string): Promise<AlbumDetail> { return api.get(`/api/public/gallery/${id}`); },
  async myAlbums(): Promise<MyAlbum[]> { return api.get('/api/gallery/albums'); },
  async createAlbum(fd: FormData): Promise<{ id: string }> { return api.postForm('/api/gallery/albums', fd); },
  async uploadPhotos(albumId: string, fd: FormData): Promise<{ uploaded: number }> {
    return api.postForm(`/api/gallery/albums/${albumId}/photos`, fd);
  },
  async submitForApproval(albumId: string): Promise<{ ok: boolean }> {
    return api.post(`/api/gallery/albums/${albumId}/submit`);
  },
};