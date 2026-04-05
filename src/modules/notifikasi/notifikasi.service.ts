import type {
  CreateNotifikasiInput,
  UpdateNotifikasiInput,
} from "./notifikasi.schema";

export type Notifikasi = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const data: Notifikasi[] = [];
let nextId = 1;

export const notifikasiService = {
  findAll: async (): Promise<Notifikasi[]> => data,

  findById: async (id: number): Promise<Notifikasi | null> =>
    data.find((item) => item.id === id) ?? null,

  create: async (payload: CreateNotifikasiInput): Promise<Notifikasi> => {
    const now = new Date();
    const newItem: Notifikasi = {
      id: nextId++,
      title: payload.title,
      message: payload.message,
      isRead: payload.isRead ?? false,
      createdAt: now,
      updatedAt: now,
    };
    data.push(newItem);
    return newItem;
  },

  update: async (
    id: number,
    payload: UpdateNotifikasiInput
  ): Promise<Notifikasi | null> => {
    const idx = data.findIndex((item) => item.id === id);
    if (idx === -1) return null;

    const current = data[idx];
    const updated: Notifikasi = {
      ...current,
      ...payload,
      updatedAt: new Date(),
    };

    data[idx] = updated;
    return updated;
  },

  remove: async (id: number): Promise<boolean> => {
    const idx = data.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    data.splice(idx, 1);
    return true;
  },
};

