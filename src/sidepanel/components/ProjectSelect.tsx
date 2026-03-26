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
          Project
        </h2>
        <p className="panel-section__description">Choose a project from the connected GitLab instance.</p>
      </div>

      <div className="field">
        <label htmlFor="project-select">Project</label>
        <select
          id="project-select"
          name="project"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{groups.length === 0 ? 'No projects loaded' : 'Select a project'}</option>
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
