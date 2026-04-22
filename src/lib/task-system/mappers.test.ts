import { describe, expect, it } from 'vitest';
import { filterIncompleteTasks, mapTaskSummary } from './mappers';

describe('task-system mappers', () => {
  it('maps raw task fields into stable task summary fields', () => {
    expect(
      mapTaskSummary({
        id: 101,
        proposalid: 'P-001',
        proposalname: '上线核心服务',
        proposaltype: 'deploy',
        proposalstatusdetail: '开发中',
        system: 'trade',
        env: 'test',
        taskjobid: 'JOB-9',
        testmanager: 'alice',
        starttime: '2026-04-22 10:00:00',
        endtime: '2026-04-22 12:00:00',
        completed: '1'
      })
    ).toEqual({
      id: '101',
      proposalId: 'P-001',
      proposalName: '上线核心服务',
      proposalType: 'deploy',
      proposalStatusDetail: '开发中',
      system: 'trade',
      env: 'test',
      taskJobId: 'JOB-9',
      testManager: 'alice',
      startTime: '2026-04-22 10:00:00',
      endTime: '2026-04-22 12:00:00',
      completed: true
    });
  });

  it('filters out completed tasks while preserving each task shape', () => {
    const incompleteTask = {
      label: 'keep',
      ...mapTaskSummary({
        id: 1,
        proposalname: 'A',
        completed: '0'
      })
    };
    const completedTask = {
      label: 'drop',
      ...mapTaskSummary({
        id: 2,
        proposalname: 'B',
        completed: true
      })
    };

    expect(filterIncompleteTasks([incompleteTask, completedTask])).toEqual([incompleteTask]);
  });
});
