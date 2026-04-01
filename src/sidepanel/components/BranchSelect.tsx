import type { GitLabBranch } from '../../lib/types';
import { SearchList } from './SearchList';
import { StatusNotice, type StatusNoticeTone } from './StatusNotice';

type BranchSelectProps = {
  branches: GitLabBranch[];
  value: string;
  query: string;
  disabled: boolean;
  onQueryChange: (branchName: string) => void;
  onChange: (branchName: string) => void;
  statusMessage?: string | null;
  statusTone?: StatusNoticeTone;
};

function formatCommittedDate(value: string): string {
  if (value === '') {
    return '提交时间未知';
  }

  return `最近提交：${value.replace('T', ' ').replace('Z', '')}`;
}

export function BranchSelect({
  branches,
  value,
  query,
  disabled,
  onQueryChange,
  onChange,
  statusMessage,
  statusTone
}: BranchSelectProps) {
  return (
    <section className="panel-section" aria-labelledby="branch-title">
      <div className="panel-section__header">
        <h2 className="panel-section__title" id="branch-title">
          分支
        </h2>
        <p className="panel-section__description">搜索分支，并按最近提交时间优先展示。</p>
      </div>

      <SearchList
        label="分支搜索"
        placeholder="搜索分支名称"
        items={branches.map((branch) => ({
          value: branch.name,
          title: branch.name,
          description: formatCommittedDate(branch.committedDate),
          meta: `Hash: ${branch.commitId.slice(0, 8)}`
        }))}
        value={value}
        query={query}
        disabled={disabled}
        emptyMessage="没有匹配的分支"
        onQueryChange={onQueryChange}
        onSelect={onChange}
      />

      {statusMessage ? <StatusNotice message={statusMessage} tone={statusTone} /> : null}
    </section>
  );
}
