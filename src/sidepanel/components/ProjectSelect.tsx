import type { GitLabProject } from '../../lib/types';
import { SearchList } from './SearchList';
import { StatusNotice, type StatusNoticeTone } from './StatusNotice';

type ProjectListItem = GitLabProject & {
  badge?: string;
};

type ProjectSelectProps = {
  projects: ProjectListItem[];
  value: string;
  query: string;
  disabled: boolean;
  onQueryChange: (query: string) => void;
  onChange: (projectId: string) => void;
  statusMessage?: string | null;
  statusTone?: StatusNoticeTone;
};

export function ProjectSelect({
  projects,
  value,
  query,
  disabled,
  onQueryChange,
  onChange,
  statusMessage,
  statusTone
}: ProjectSelectProps) {
  return (
    <section className="panel-section" aria-labelledby="project-title">
      <div className="panel-section__header">
        <h2 className="panel-section__title" id="project-title">
          仓库
        </h2>
        <p className="panel-section__description">搜索仓库名称或路径，并优先显示常用仓库。</p>
      </div>

      <SearchList
        label="仓库搜索"
        placeholder="搜索仓库名称或路径"
        items={projects.map((project) => ({
          value: String(project.id),
          title: project.name,
          description: project.pathWithNamespace,
          badge: project.badge
        }))}
        value={value}
        query={query}
        disabled={disabled}
        emptyMessage="没有匹配的仓库"
        clearSelectionLabel="清空仓库选择"
        onQueryChange={onQueryChange}
        onSelect={onChange}
      />

      {statusMessage ? <StatusNotice message={statusMessage} tone={statusTone} /> : null}
    </section>
  );
}
