import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import type { RxJsonSchema, RxDatabase } from 'rxdb';

import type { TaskDocument } from '../types';

if (import.meta.env.DEV) {
  addRxPlugin(RxDBDevModePlugin);
}

addRxPlugin(RxDBUpdatePlugin);

export const TaskSchema: RxJsonSchema<TaskDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    title: {
      type: 'string',
      maxLength: 200,
    },
    coordinates: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['x', 'y'],
      additionalProperties: false,
    },
    checklistName: {
      type: 'string',
      maxLength: 100,
    },
    checklist: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          status: {
            type: 'string',
            enum: ['not_started', 'in_progress', 'blocked', 'final_check_awaiting', 'done'],
          },
          order: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'text', 'status', 'order', 'createdAt'],
        additionalProperties: false,
      },
    },
    version: {
      type: 'number',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: [
    'id',
    'userId',
    'title',
    'coordinates',
    'checklistName',
    'checklist',
    'version',
    'createdAt',
    'updatedAt',
  ],
  indexes: ['userId'],
};

const createAndInitializeDatabase = async (dbName: string): Promise<RxDatabase> => {
  const storage = import.meta.env.DEV
    ? wrappedValidateAjvStorage({ storage: getRxStorageDexie() })
    : getRxStorageDexie();

  const database = await createRxDatabase({
    name: dbName,
    storage,
    eventReduce: true,
    ignoreDuplicate: import.meta.env.DEV,
  });

  await database.addCollections({
    tasks: {
      schema: TaskSchema,
    },
  });

  return database;
};

export const createUserDatabase = async (userId: string): Promise<RxDatabase> => {
  const dbName = `floorsync_${userId}`;

  try {
    return await createAndInitializeDatabase(dbName);
  } catch (error) {
    if (error instanceof Error && error.message.includes('DB8')) {
      return await createAndInitializeDatabase(dbName);
    }

    throw error;
  }
};
