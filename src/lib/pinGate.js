// ─────────────────────────────────────────────
// 관리자 PIN 게이트 공용 로직.
// admin.html/upload.html이 완전히 동일한 절차(PIN 입력 → /api/verify-pin
// 확인 → 통과 시 #gate 숨기고 #app 표시)를 각자 따로 구현하고 있었다.
// 검증 방식이 바뀌면(예: 잠금 시간 추가) 두 파일을 따로 고쳐야 하는 중복이라
// 여기 하나로 모은다. 실제 쓰기 권한은 이 게이트 통과 자체가 아니라 매 쓰기
// 요청마다 서버(/api/admin-write 등)가 PIN을 다시 검증하는 데서 나온다 —
// 이 게이트는 매번 PIN을 다시 입력받지 않기 위한 UX 편의일 뿐이다.
// ─────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

/**
 * PIN 게이트를 초기화한다. #pin, #pinBtn, #pinErr, #gate, #app id를 가진
 * 요소가 있어야 한다(admin.html/upload.html 공통 마크업).
 * @param {(pin: string) => void|Promise<void>} onSuccess - 통과한 PIN을 받아
 *   호출자가 이어서 화면별 초기화(initSync·initApp 등)를 하도록 한다.
 */
export function initPinGate(onSuccess) {
  async function tryPin() {
    const candidate = $('pin').value;
    $('pinBtn').disabled = true;
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: candidate }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        $('gate').classList.add('hidden');
        $('app').classList.remove('hidden');
        await onSuccess(candidate);
      } else {
        $('pinErr').textContent = data.error || 'PIN이 올바르지 않습니다.';
        $('pin').value = '';
      }
    } catch (err) {
      $('pinErr').textContent = `확인 실패: ${err.message}`;
    } finally {
      $('pinBtn').disabled = false;
    }
  }
  $('pinBtn').onclick = tryPin;
  $('pin').addEventListener('keydown', e => { if (e.key === 'Enter') tryPin(); });
}
