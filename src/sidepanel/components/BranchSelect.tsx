import type { GitLabBranch } from '../../lib/types';
import { StatusNotice, type StatusNoticeTone } from './StatusNotice';

type BranchSelectProps = {
  branches: GitLabBranch[];
  value: string;
  disabled: boolean;
  onChange: (branchName: string) => void;
  statusMessage?: string | null;
  statusTone?: StatusNoticeTone;
};

export function BranchSelect({ branches, value, disabled, onChange, statusMessage, statusTone }: BranchSelectProps) {
  return (
    <section className="panel-section" aria-labelledby="branch-title">
      <div className="panel-section__header">
        <h2 className="panel-section__title" id="branch-title">
          分支
        </h2>
        <p className="panel-section__description">选择分支并查看该分支最新提交的 hash。</p>
      </div>

      <div className="field">
        <label htmlFor="branch-select">分支</label>
        <select
          id="branch-select"
          name="branch"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{branches.length === 0 ? '暂无分支' : '请选择分支'}</option>
          {branches.map((branch) => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {statusMessage ? <StatusNotice message={statusMessage} tone={statusTone} /> : null}
    </section>
  );
}
