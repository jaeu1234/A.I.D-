// admin.html/upload.html의 PIN 게이트가 즉각적인 성공/실패 피드백을 주기 위한
// 엔드포인트. 실제 쓰기 권한은 이걸 통과했다는 사실만으로 주어지지 않는다 —
// api/admin-write.js가 매 쓰기 요청마다 PIN을 독립적으로 다시 검증한다.
const { readKey } = require('./_lib/env');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다.' });
    return;
  }

  // readKey는 값에 섞여 들어온 BOM·공백을 걷어낸다 — 안 걸러내면 PIN이 절대
  // 안 맞는 것처럼 보이는데 원인은 화면에 전혀 드러나지 않는다(_lib/env.js 참고).
  let adminPin;
  try {
    adminPin = readKey('ADMIN_PIN');
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  const { pin } = req.body || {};
  res.status(200).json({ ok: pin === adminPin });
};
