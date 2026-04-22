import { StatusNotice, type StatusNoticeTone } from './StatusNotice';

type TaskSystemFormProps = {
  baseUrl: string;
  loginName: string;
  loginPwd: string;
  isRefreshDisabled?: boolean;
  onBaseUrlChange: (value: string) => void;
  onLoginNameChange: (value: string) => void;
  onLoginPwdChange: (value: string) => void;
  onRefresh: () => void;
  statusMessage?: string | null;
  statusTone?: StatusNoticeTone;
};

export function TaskSystemForm({
  baseUrl,
  loginName,
  loginPwd,
  isRefreshDisabled = false,
  onBaseUrlChange,
  onLoginNameChange,
  onLoginPwdChange,
  onRefresh,
  statusMessage,
  statusTone,
}: TaskSystemFormProps) {
  return (
    <section className="panel-section" aria-labelledby="task-system-title">
      <div className="panel-section__header">
        <h2 className="panel-section__title" id="task-system-title">
          任务系统
        </h2>
        <p className="panel-section__description">配置任务系统地址和登录信息，为后续任务刷新预留入口。</p>
      </div>

      <div className="task-system-form">
        <div className="field">
          <label htmlFor="task-system-base-url">任务系统地址</label>
          <input
            id="task-system-base-url"
            name="taskSystemBaseUrl"
            type="url"
            value={baseUrl}
            onChange={(event) => onBaseUrlChange(event.target.value)}
            placeholder="http://10.254.239.10:10086"
          />
        </div>

        <div className="field">
          <label htmlFor="task-system-login-name">登录账号</label>
          <input
            id="task-system-login-name"
            name="taskSystemLoginName"
            type="text"
            value={loginName}
            onChange={(event) => onLoginNameChange(event.target.value)}
            placeholder="请输入登录账号"
          />
        </div>

        <div className="field">
          <label htmlFor="task-system-login-password">登录密码</label>
          <input
            id="task-system-login-password"
            name="taskSystemLoginPassword"
            type="password"
            value={loginPwd}
            onChange={(event) => onLoginPwdChange(event.target.value)}
            placeholder="请输入登录密码"
          />
        </div>

        <div className="task-system-form__actions">
          <button className="button button--secondary" type="button" onClick={onRefresh} disabled={isRefreshDisabled}>
            刷新任务
          </button>
        </div>
      </div>

      {statusMessage ? <StatusNotice message={statusMessage} tone={statusTone} /> : null}
    </section>
  );
}
