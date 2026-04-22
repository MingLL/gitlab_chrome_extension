import type { TaskSummary } from '../../lib/types';

type SelectedTaskSummaryProps = {
  task: TaskSummary | null;
};

function renderValue(value: string): string {
  return value === '' ? '尚未提供' : value;
}

export function SelectedTaskSummary({ task }: SelectedTaskSummaryProps) {
  return (
    <section className="panel-section" aria-labelledby="selected-task-summary-title">
      <div className="panel-section__header">
        <h2 className="panel-section__title" id="selected-task-summary-title">
          当前任务
        </h2>
        <p className="panel-section__description">保留当前选中的任务信息，供后续流程继续使用。</p>
      </div>

      {task ? (
        <dl className="summary-list">
          <div>
            <dt>需求名称</dt>
            <dd>{renderValue(task.proposalName)}</dd>
          </div>
          <div>
            <dt>任务单号</dt>
            <dd>{renderValue(task.taskJobId)}</dd>
          </div>
          <div>
            <dt>环境</dt>
            <dd>{renderValue(task.env)}</dd>
          </div>
          <div>
            <dt>系统</dt>
            <dd>{renderValue(task.system)}</dd>
          </div>
          <div>
            <dt>开始时间</dt>
            <dd>{renderValue(task.startTime)}</dd>
          </div>
          <div>
            <dt>结束时间</dt>
            <dd>{renderValue(task.endTime)}</dd>
          </div>
        </dl>
      ) : (
        <p className="search-list__empty">请先从待办任务中选择一项。</p>
      )}
    </section>
  );
}
