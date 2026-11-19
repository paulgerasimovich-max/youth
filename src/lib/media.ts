// Фото и видео: выбрать с телефона и загрузить в закрытое хранилище.

import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { mediaTints } from '../theme';
import type { MediaItem } from '../data/types';

// Сколько весит самый большой файл, который принимает хранилище (50 МБ)
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type PickedInfo = { mimeType?: string; size?: number };
const picked = new Map<string, PickedInfo>(); // подробности о выбранных файлах до загрузки

function durationLabel(ms: number | null | undefined): string | undefined {
  if (!ms) return undefined;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Открыть галерею телефона. Возвращает выбранное (ещё не загруженное).
export async function pickFromLibrary(kind: 'photo' | 'video', multiple: boolean): Promise<MediaItem[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'photo' ? ['images'] : ['videos'],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 20 : 1,
    quality: 0.7, // сжимаем фото: грузится быстрее, на экране телефона разницы не видно
  });
  if (result.canceled) return [];
  return result.assets.map((asset, i) => {
    const id = Crypto.randomUUID();
    picked.set(id, { mimeType: asset.mimeType ?? undefined, size: asset.fileSize ?? undefined });
    return {
      id, kind, tint: mediaTints[i % mediaTints.length], emoji: '', uri: asset.uri, local: true,
      duration: kind === 'video' ? durationLabel(asset.duration) : undefined,
    };
  });
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'video/mp4': 'mp4', 'video/quicktime': 'mov',
};

// Загрузить файл в хранилище. Возвращает путь к файлу или null, если не получилось.
export async function uploadMedia(item: MediaItem, folder: string): Promise<string | null> {
  if (!item.uri) return null;
  try {
    const info = picked.get(item.id) ?? {};
    if (info.size && info.size > MAX_UPLOAD_BYTES) return null;
    const response = await fetch(item.uri);
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_UPLOAD_BYTES) return null;
    const fallback = item.kind === 'photo' ? 'image/jpeg' : 'video/mp4';
    const type = info.mimeType ?? response.headers.get('content-type') ?? fallback;
    const contentType = EXTENSIONS[type] ? type : fallback;
    const path = `${folder}/${item.id}.${EXTENSIONS[contentType]}`;
    const { error } = await supabase.storage.from('media').upload(path, body, { contentType, upsert: false });
    if (error) {
      console.warn('Upload failed', error.message);
      return null;
    }
    picked.delete(item.id);
    return path;
  } catch (e) {
    console.warn('Upload failed', e);
    return null;
  }
}
