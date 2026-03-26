import { StatusNotice, type StatusNoticeTone } from './StatusNotice';

type ConnectionFormProps = {
  baseUrl: string;
  token: string;
  isConnecting?: boolean;
  onBaseUrlChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onConnect: () => void;
  statusMessage?: string | null;
  statusTone?: StatusNoticeTone;
};

export function ConnectionForm({
  baseUrl,
  token,
  isConnecting = false,
  onBaseUrlChange,
  onTokenChange,
  onConnect,
  statusMessage,
  statusTone,
}: ConnectionFormProps) {
  return (
    <section className="panel-section" aria-labelledby="connection-title">
      <div className="panel-section__header">
        <h2 className="panel-section__title" id="connection-title">
          连接配置
        </h2>
        <p className="panel-section__description">输入 GitLab 地址和个人访问令牌。</p>
      </div>

      <div className="connection-form">
        <div className="field">
          <label htmlFor="gitlab-base-url">GitLab 地址</label>
          <input
            id="gitlab-base-url"
            name="baseUrl"
            type="url"
            disabled={isConnecting}
            value={baseUrl}
            onChange={(event) => onBaseUrlChange(event.target.value)}
            placeholder="https://gitlab.example.com"
          />
        </div>

        <div className="field">
          <label htmlFor="gitlab-token">Token</label>
          <input
            id="gitlab-token"
            name="token"
            type="password"
            disabled={isConnecting}
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder="glpat-..."
          />
        </div>

        <button className="button" type="button" onClick={onConnect} disabled={isConnecting}>
          连接
        </button>
      </div>

      {statusMessage ? <StatusNotice message={statusMessage} tone={statusTone} /> : null}
    </section>
  );
}
