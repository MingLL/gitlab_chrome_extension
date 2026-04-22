import type { TaskSummary, TaskSystemTaskResponse } from './types';

function normalizeCompleted(completed: TaskSystemTaskResponse['completed']): boolean {
  return completed === true || completed === 1 || completed === '1';
}

export function mapTaskSummary(task: TaskSystemTaskResponse): TaskSummary {
  return {
    id: String(task.id),
    proposalId: task.proposalid ?? '',
    proposalName: task.proposalname ?? '',
    proposalType: task.proposaltype ?? '',
    proposalStatusDetail: task.proposalstatusdetail ?? '',
    system: task.system ?? '',
    env: task.env ?? '',
    taskJobId: task.taskjobid ?? '',
    testManager: task.testmanager ?? '',
    startTime: task.starttime ?? '',
    endTime: task.endtime ?? '',
    completed: normalizeCompleted(task.completed)
  };
}

export function isCompletedTask(task: Pick<TaskSummary, 'completed'>): boolean {
  return task.completed;
}

export function filterIncompleteTasks<T extends Pick<TaskSummary, 'completed'>>(tasks: T[]): T[] {
  return tasks.filter((task) => !isCompletedTask(task));
}
