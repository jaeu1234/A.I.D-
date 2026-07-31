// admin.html/upload.html의 PIN 게이트가 즉각적인 성공/실패 피드백을 주기 위한
// 엔드포인트. 실제 쓰기 권한은 이걸 통과했다는 사실만으로 주어지지 않는다 —
// api/admin-write.js가 매 쓰기 요청마다 PIN을 독립적으로 다시 검증한다.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다.' });
    return;
  }

  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    res.status(500).json({ error: '서버에 ADMIN_PIN 환경변수가 설정되어 있지 않습니다.' });
    return;
  }

  const { pin } = req.body || {};
  res.status(200).json({ ok: pin === adminPin });
};
