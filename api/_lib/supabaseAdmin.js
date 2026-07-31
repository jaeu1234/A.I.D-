// Supabase REST(PostgREST)를 service_role 키로 직접 호출하는 헬퍼.
// service_role 키는 RLS를 우회하므로 서버(이 파일을 쓰는 api/*.js)에서만 써야 한다.
//
// @supabase/supabase-js SDK 대신 fetch만 쓰는 이유: 이 저장소는 빌드 과정이 없고
// api/ 함수는 npm install 없이 그대로 배포되는데, 이 정도 REST 호출에는 SDK가
// 굳이 필요 없다.
//
// 폴더 이름이 _lib인 이유: Vercel은 api/ 아래 .js 파일을 전부 라우트로 자동
// 등록하는데, 앞에 _가 붙은 파일·폴더는 라우트 등록에서 제외한다. 그래서
// 이 헬퍼는 엔드포인트가 아니라 sibling 함수들이 require하는 내부 모듈로만 쓰인다.

const SUPABASE_URL = 'https://iuydyigpsqqvpngbdzmm.supabase.co';

function serviceHeaders(extra) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('서버에 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다.');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/**
 * Supabase REST(PostgREST)에 service_role 권한으로 요청.
 * @param {string} path - 예: 'overrides' 또는 'overrides?id=eq.3'
 * @param {{method?: string, body?: object, extraHeaders?: object}} opts
 * @returns {Promise<any>} 응답 바디(JSON) 또는 빈 응답이면 null
 */
async function restRequest(path, opts = {}) {
  const { method = 'GET', body, extraHeaders } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: serviceHeaders(extraHeaders),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (Array.isArray(data) ? data[0]?.message : data?.message) || `Supabase REST 오류 (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return data;
}

module.exports = { restRequest };
