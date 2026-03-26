import { useEffect, useRef, useState } from 'react';

import { copyText } from '../../lib/ui/copy';
import { StatusNotice } from './StatusNotice';

type ResultSummaryProps = {
  projectWebUrl: string;
  selectedBranchName: string;
  latestCommitHash: string;
  statusMessage?: string | null;
};

const COPY_FEEDBACK_MS = 1500;

type CopyFieldKey = 'url' | 'branch' | 'hash';

export function ResultSummary({
  projectWebUrl,
  selectedBranchName,
  latestCommitHash,
  statusMessage
}: ResultSummaryProps) {
  const [copiedField, setCopiedField] = useState<CopyFieldKey | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);

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
          Result Summary
        </h2>
        <p className="panel-section__description">Copy the selected project URL, branch, or latest commit hash.</p>
      </div>

      <dl className="summary-list">
        <div>
          <dt>Project web URL</dt>
          <dd className="summary-list__value-row">
            <span>{projectWebUrl || 'Not loaded yet'}</span>
            <button
              type="button"
              className="button"
              disabled={projectWebUrl === ''}
              onClick={() => {
                void handleCopy('url', projectWebUrl);
              }}
            >
              {copiedField === 'url' ? 'Copied' : 'Copy URL'}
            </button>
          </dd>
        </div>
        <div>
          <dt>Selected branch</dt>
          <dd className="summary-list__value-row">
            <span>{selectedBranchName || 'Not loaded yet'}</span>
            <button
              type="button"
              className="button"
              disabled={selectedBranchName === ''}
              onClick={() => {
                void handleCopy('branch', selectedBranchName);
              }}
            >
              {copiedField === 'branch' ? 'Copied' : 'Copy Branch'}
            </button>
          </dd>
        </div>
        <div>
          <dt>Latest commit hash</dt>
          <dd className="summary-list__value-row">
            <span>{latestCommitHash}</span>
            <button
              type="button"
              className="button"
              disabled={latestCommitHash === 'Not loaded yet'}
              onClick={() => {
                void handleCopy('hash', latestCommitHash);
              }}
            >
              {copiedField === 'hash' ? 'Copied' : 'Copy Hash'}
            </button>
          </dd>
        </div>
      </dl>

      {statusMessage ? <StatusNotice message={statusMessage} /> : null}
    </section>
  );
}
