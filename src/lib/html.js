// ─────────────────────────────────────────────
// HTML 이스케이프 공용 유틸
// 사용자/AI 입력을 innerHTML에 삽입하기 전 반드시 거쳐야 한다.
// ─────────────────────────────────────────────

/** 문자열을 HTML 텍스트로 안전하게 삽입할 수 있도록 이스케이프 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
