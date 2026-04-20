import {
  autofillReleaseForm,
  type ReleaseFormAutofillPayload,
  type ReleaseFormAutofillResult
} from '../autofill/releaseForm';

export async function fillReleaseFormInActiveTab(
  payload: ReleaseFormAutofillPayload
): Promise<ReleaseFormAutofillResult> {
  try {
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
  } catch (error) {
    const reason = error instanceof Error ? error.message : '发生了未知错误。';
    return { ok: false, reason: `向页面注入脚本时出错：${reason}` };
  }
}
