import { USE_MOCKS } from '@/lib/env';
import { api } from '@/lib/api';

export interface Paged<T> { data: T[]; page: number; limit: number; total: number }
export interface NewsListItem { slug: string; title: string; excerpt: string | null; coverImageUrl: string | null; publishedAt: string }
export interface NewsDetail extends NewsListItem { body: string | null; authorName: string | null }
export interface EventItem { slug: string; title: string; description: string | null; coverImageUrl: string | null; startAt: string; endAt: string | null; location: string | null }
export interface ProjectItem { slug: string; title: string; description: string | null; coverImageUrl: string | null; progress: number; status: string; sessionLabel: string | null }
export interface MyContentItem { id: string; title: string; slug?: string; status: string; createdAt: string; publishedAt?: string | null; startAt?: string | null; progress?: number }

const DEMO_DELAY = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const contentService = {
  async getNews(page = 1): Promise<Paged<NewsListItem>> {
    if (USE_MOCKS) {
      await DEMO_DELAY(300);
      return { page, limit: 9, total: 2, data: [
        { slug: 'demo-1', title: 'NAKOSS wins debate championship (demo)', excerpt: 'Our team placed first among 12 institutions…', coverImageUrl: null, publishedAt: new Date().toISOString() },
        { slug: 'demo-2', title: 'Past questions drive launched (demo)', excerpt: 'Submit scanned past questions to your P.R.O…', coverImageUrl: null, publishedAt: new Date().toISOString() },
      ]};
    }
    return api.get<Paged<NewsListItem>>(`/api/public/news?page=${page}`);
  },
  async getNewsItem(slug: string): Promise<NewsDetail> {
    if (USE_MOCKS) { await DEMO_DELAY(300); return { slug, title: 'Demo article', excerpt: null, body: 'This is demo content. Real articles appear once published through the approval flow.', coverImageUrl: null, publishedAt: new Date().toISOString(), authorName: null }; }
    return api.get<NewsDetail>(`/api/public/news/${encodeURIComponent(slug)}`);
  },
  async getEvents(): Promise<EventItem[]> {
    if (USE_MOCKS) { await DEMO_DELAY(300); return [{ slug: 'demo', title: 'Orientation week (demo)', description: null, coverImageUrl: null, startAt: new Date(Date.now() + 7 * 864e5).toISOString(), endAt: null, location: 'Main auditorium' }]; }
    return api.get<EventItem[]>('/api/public/events');
  },
  async getProjects(): Promise<ProjectItem[]> {
    if (USE_MOCKS) { await DEMO_DELAY(300); return [{ slug: 'demo', title: 'Computer lab renovation (demo)', description: null, coverImageUrl: null, progress: 45, status: 'ongoing', sessionLabel: '2026/2027' }]; }
    return api.get<ProjectItem[]>('/api/public/projects');
  },

  // ── Manage (officers) ──
  async myNews(): Promise<MyContentItem[]> { return USE_MOCKS ? [] : api.get('/api/news/mine'); },
  async myEvents(): Promise<MyContentItem[]> { return USE_MOCKS ? [] : api.get('/api/events/mine'); },
  async myProjects(): Promise<MyContentItem[]> { return USE_MOCKS ? [] : api.get('/api/projects/mine'); },
  async myAnnouncements(): Promise<MyContentItem[]> { return USE_MOCKS ? [] : api.get('/api/announcements/mine'); },

  async createNews(fd: FormData): Promise<{ id: string }> { return api.postForm('/api/news', fd); },
  async createEvent(fd: FormData): Promise<{ id: string }> { return api.postForm('/api/events', fd); },
  async createProject(input: { title: string; description?: string; progress?: number }): Promise<{ id: string }> { return api.post('/api/projects', input); },
  async createAnnouncement(input: { title: string; body: string }): Promise<{ id: string }> { return api.post('/api/announcements', input); },
};