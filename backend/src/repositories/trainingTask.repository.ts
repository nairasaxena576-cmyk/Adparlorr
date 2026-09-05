import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function listAllTasks(client: Client = prisma) {
  return client.trainingTask.findMany({ orderBy: { order: 'asc' } });
}

export function listPublishedRequiredTasks(client: Client = prisma) {
  return client.trainingTask.findMany({
    where: { isPublished: true, isRequired: true },
    orderBy: { order: 'asc' },
  });
}

export function findTaskById(id: string, client: Client = prisma) {
  return client.trainingTask.findUnique({ where: { id } });
}

export function findPublishedTaskById(id: string, client: Client = prisma) {
  return client.trainingTask.findFirst({ where: { id, isPublished: true } });
}

export function createTask(data: Prisma.TrainingTaskCreateInput, client: Client = prisma) {
  return client.trainingTask.create({ data });
}

export function updateTask(id: string, data: Prisma.TrainingTaskUpdateInput, client: Client = prisma) {
  return client.trainingTask.update({ where: { id }, data });
}

export function deleteTask(id: string, client: Client = prisma) {
  return client.trainingTask.delete({ where: { id } });
}
