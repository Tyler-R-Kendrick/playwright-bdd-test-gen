/**
 * Simple in-memory resource manager used by the MCP server and HTTP routes.
 * Resources are grouped by type (e.g. 'feature') and stored in memory.
 * This keeps feature files as MCP resources instead of writing them to disk.
 */

import { v4 as uuidv4 } from 'uuid';

export type Resource = {
  id: string;
  type: string;
  filename?: string;
  content: string;
  createdAt: string;
};

const resources = new Map<string, Map<string, Resource>>();

export function createResource(type: string, content: string, filename?: string) {
  let bucket = resources.get(type);
  if (!bucket) {
    bucket = new Map<string, Resource>();
    resources.set(type, bucket);
  }
  const id = uuidv4();
  const r: Resource = { id, type, filename, content, createdAt: new Date().toISOString() };
  bucket.set(id, r);
  return r;
}

export function getResource(type: string, id: string): Resource | undefined {
  return resources.get(type)?.get(id);
}

export function listResources(type: string) {
  const bucket = resources.get(type);
  if (!bucket) return [] as Array<{ id: string; filename?: string; createdAt: string }>;
  return Array.from(bucket.values()).map(({ id, filename, createdAt }) => ({ id, filename, createdAt }));
}

export function deleteResource(type: string, id: string) {
  const bucket = resources.get(type);
  if (!bucket) return false;
  return bucket.delete(id);
}
