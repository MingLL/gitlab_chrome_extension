import type { ProjectGroup } from '../../lib/ui/groupProjects';
import { StatusNotice, type StatusNoticeTone } from './StatusNotice';

type ProjectSelectProps = {
  groups: ProjectGroup[];
  value: string;
  disabled: boolean;
  onChange: (projectId: string) => void;
  statusMessage?: string | null;
  statusTone?: StatusNoticeTone;
};

export function ProjectSelect({ groups, value, disabled, onChange, statusMessage, statusTone }: ProjectSelectProps) {
  return (
    <section className="panel-section" aria-labelledby="project-title">
      <div className="panel-section__header">
        <h2 className="panel-section__title" id="project-title">
          仓库
        </h2>
        <p className="panel-section__description">从当前 GitLab 实例中选择仓库。</p>
      </div>

      <div className="field">
        <label htmlFor="project-select">仓库</label>
        <select
          id="project-select"
          name="project"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{groups.length === 0 ? '暂无仓库' : '请选择仓库'}</option>
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {`${project.label} (${project.pathWithNamespace})`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {statusMessage ? <StatusNotice message={statusMessage} tone={statusTone} /> : null}
    </section>
  );
}
