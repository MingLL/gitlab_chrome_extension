import {
  autofillReleaseForm,
  type ReleaseFormAutofillPayload,
  type ReleaseFormAutofillResult
} from '../autofill/releaseForm';

export async function fillReleaseFormInActiveTab(
  payload: ReleaseFormAutofillPayload
): Promise<ReleaseFormAutofillResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return { ok: false, reason: '未找到当前活动页面' };
  }

  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: autofillReleaseForm,
    args: [payload]
  });

  const [firstResult] = injectionResults;

  return firstResult?.result ?? { ok: false, reason: '当前页面不支持注入' };
}
