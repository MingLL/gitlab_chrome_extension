import type { TaskSummary } from '../../lib/types';

type TaskListProps = {
  tasks: TaskSummary[];
  selectedTaskId: string | null;
  onSelect: (task: TaskSummary) => void;
};

export function TaskList({ tasks, selectedTaskId, onSelect }: TaskListProps) {
  return (
    <section className="panel-section" aria-labelledby="task-list-title">
      <div className="panel-section__header">
        <h2 className="panel-section__title" id="task-list-title">
          待办任务
        </h2>
        <p className="panel-section__description">显示当前账号下未完成的开发任务，并支持选择当前任务。</p>
      </div>

      <div className="task-list" role="list" aria-label="待办任务列表">
        {tasks.map((task) => (
          <div key={task.id} role="listitem">
            <button
              type="button"
              className={`task-list__item${selectedTaskId === task.id ? ' task-list__item--selected' : ''}`}
              aria-label={task.proposalName || task.taskJobId || '未命名任务'}
              onClick={() => onSelect(task)}
            >
              <span className="task-list__title">{task.proposalName || task.taskJobId || '未命名任务'}</span>
              <span className="task-list__meta">{task.taskJobId || '缺少 taskJobId'}</span>
              <span className="task-list__meta">
                {task.system || '未知系统'} / {task.env || '未知环境'}
              </span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
