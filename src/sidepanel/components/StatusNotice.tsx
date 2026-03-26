export type StatusNoticeTone = 'info' | 'warning' | 'error';

type StatusNoticeProps = {
  message: string;
  tone?: StatusNoticeTone;
};

export function StatusNotice({ message, tone = 'info' }: StatusNoticeProps) {
  return (
    <p className={`status-notice status-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {message}
    </p>
  );
}
