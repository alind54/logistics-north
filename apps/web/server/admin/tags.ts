import { prisma } from '../db';
import type { TagDTO } from '@request-tracker/shared';

export async function listTags(): Promise<TagDTO[]> {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
  });
  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));
}

export async function createTag(
  name: string,
  color: string | null | undefined
): Promise<TagDTO> {
  const tag = await prisma.tag.create({
    data: { name, color: color ?? null },
  });
  return { id: tag.id, name: tag.name, color: tag.color };
}

export async function updateTag(
  tagId: string,
  input: { name?: string; color?: string | null }
): Promise<TagDTO | null> {
  const existing = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!existing) return null;

  const tag = await prisma.tag.update({
    where: { id: tagId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
    },
  });
  return { id: tag.id, name: tag.name, color: tag.color };
}

export async function deleteTag(tagId: string): Promise<boolean> {
  const existing = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!existing) return false;

  await prisma.tag.delete({ where: { id: tagId } });
  return true;
}
