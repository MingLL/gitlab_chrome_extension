import { useEffect, useRef, useState } from 'react';

import { copyText } from '../../lib/ui/copy';
import { StatusNotice } from './StatusNotice';

type ResultSummaryProps = {
  projectCloneUrl: string;
  selectedBranchName: string;
  latestCommitHash: string;
  statusMessage?: string | null;
};

const COPY_FEEDBACK_MS = 1500;
const EMPTY_VALUE = '尚未加载';

type CopyFieldKey = 'url' | 'urlWithoutGit' | 'branch' | 'hash';

function getCloneUrlWithoutGitSuffix(projectCloneUrl: string): string {
  return projectCloneUrl.endsWith('.git') ? projectCloneUrl.slice(0, -4) : projectCloneUrl;
}

export function ResultSummary({
  projectCloneUrl,
  selectedBranchName,
  latestCommitHash,
  statusMessage
}: ResultSummaryProps) {
  const [copiedField, setCopiedField] = useState<CopyFieldKey | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const projectCloneUrlWithoutGitSuffix = getCloneUrlWithoutGitSuffix(projectCloneUrl);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy(field: CopyFieldKey, value: string) {
    await copyText(value);

    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    setCopiedField(field);
    resetTimeoutRef.current = window.setTimeout(() => {
      setCopiedField(null);
      resetTimeoutRef.current = null;
    }, COPY_FEEDBACK_MS);
  }

  return (
    <section className="panel-section" aria-labelledby="result-summary-title">
      <div className="panel-section__header">
        <h2 className="panel-section__title" id="result-summary-title">
          结果汇总
        </h2>
        <p className="panel-section__description">复制当前仓库链接、分支和最新提交 hash。</p>
      </div>

      <dl className="summary-list">
        <div>
          <dt>仓库链接</dt>
          <dd className="summary-list__value-row">
            <span>{projectCloneUrl || EMPTY_VALUE}</span>
            <button
              type="button"
              className="button"
              disabled={projectCloneUrl === ''}
              onClick={() => {
                void handleCopy('url', projectCloneUrl);
              }}
            >
              {copiedField === 'url' ? '已复制' : '复制链接'}
            </button>
            <button
              type="button"
              className="button"
              disabled={projectCloneUrl === ''}
              onClick={() => {
                void handleCopy('urlWithoutGit', projectCloneUrlWithoutGitSuffix);
              }}
            >
              {copiedField === 'urlWithoutGit' ? '已复制' : '复制无 .git 链接'}
            </button>
          </dd>
        </div>
        <div>
          <dt>分支信息</dt>
          <dd className="summary-list__value-row">
            <span>{selectedBranchName || EMPTY_VALUE}</span>
            <button
              type="button"
              className="button"
              disabled={selectedBranchName === ''}
              onClick={() => {
                void handleCopy('branch', selectedBranchName);
              }}
            >
              {copiedField === 'branch' ? '已复制' : '复制分支'}
            </button>
          </dd>
        </div>
        <div>
          <dt>Hash 信息</dt>
          <dd className="summary-list__value-row">
            <span>{latestCommitHash}</span>
            <button
              type="button"
              className="button"
              disabled={latestCommitHash === EMPTY_VALUE}
              onClick={() => {
                void handleCopy('hash', latestCommitHash);
              }}
            >
              {copiedField === 'hash' ? '已复制' : '复制 Hash'}
            </button>
          </dd>
        </div>
      </dl>

      {statusMessage ? <StatusNotice message={statusMessage} /> : null}
    </section>
  );
}
