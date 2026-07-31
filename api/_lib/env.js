// 서버리스 함수들이 환경변수에서 API 키를 읽을 때 쓰는 공용 헬퍼.
//
// 폴더 이름이 _lib인 이유는 supabaseAdmin.js 주석 참고(앞에 _가 붙으면 Vercel이
// 라우트로 등록하지 않는다).

/**
 * 환경변수에서 API 키를 읽어 HTTP 헤더에 넣을 수 있는 형태로 정리한다.
 *
 * 대시보드나 CLI로 키를 넣는 과정에서 앞뒤 공백·개행이나 BOM(U+FEFF)이 섞여
 * 들어올 수 있다. 헤더 값은 Latin-1만 허용하므로 BOM이 하나만 붙어도 fetch가
 * "Cannot convert argument to a ByteString because the character at index 0
 * has a value of 65279..."로 요청 자체를 거부하고, 호출자에게는 원인이 전혀
 * 드러나지 않는 502로만 보인다. 실제로 이 저장소에서 그 일이 있었다
 * (PowerShell 파이프가 stdin 앞에 BOM을 붙여 Vercel에 그대로 저장됨).
 *
 * @param {string} name - 환경변수 이름
 * @returns {string} 정리된 키
 * @throws {Error} 값이 없거나 정리 후 빈 문자열이면
 */
function readKey(name) {
  const raw = process.env[name];
  if (!raw) throw new Error(`서버에 ${name} 환경변수가 설정되어 있지 않습니다.`);
  // BOM(U+FEFF)은 눈에 보이지 않는 문자라 소스에 리터럴로 두면 나중에 읽는 사람이
  // 알아챌 수 없다. 코드포인트로 만들어 쓴다.
  const BOM = String.fromCharCode(0xFEFF);
  const key = raw.split(BOM).join('').trim();
  if (!key) throw new Error(`서버의 ${name} 환경변수가 비어 있습니다.`);
  return key;
}

module.exports = { readKey };
