// Vercel 서버리스 함수 (Node.js 런타임, 빌드 도구 불필요 — /api/*.js는 자동 감지됨).
//
// upload.html이 시간표 사진을 Anthropic API로 직접 보내던 방식은 API 키를
// 브라우저 localStorage에 저장하고 요청 헤더에 실어 보내야 해서, 같은 기기를
// 쓰는 다른 사람이 devtools로 키를 그대로 읽어갈 수 있었다. 이 함수가 대신
// 호출을 중계해서 키가 서버 환경변수(ANTHROPIC_API_KEY)에만 존재하게 한다.
//
// 배포 시 Vercel 프로젝트 설정 → Environment Variables에 ANTHROPIC_API_KEY를
// 등록해야 동작한다.

const MODEL = 'claude-sonnet-5';

function buildInstruction(mode, grade, classNum) {
  if (mode === 'teacher') {
    return '이 이미지는 한 선생님의 주간 시간표입니다. 내용을 읽어 2차원 배열 schedule로 변환하세요. ' +
      'schedule[요일][교시] 구조이며 요일 인덱스는 0=월,1=화,2=수,3=목,4=금 (총 5개), ' +
      '교시 인덱스는 0~7 (1교시,2교시,3교시,4교시,점심,5교시,6교시,7교시 순, 총 8개)입니다. ' +
      '각 칸의 값은 "과목(학년-반)" 형식 문자열(예: "수학(2-1)")로, 수업이 없으면 null로 채우세요. ' +
      '점심 열(인덱스 4)은 일반적으로 null입니다. 읽을 수 없는 칸은 null로 두세요.';
  }
  return `이 이미지는 ${grade}학년 ${classNum}반의 주간 시간표입니다. 내용을 읽어 2차원 배열 schedule로 변환하세요. ` +
    'schedule[요일][교시] 구조이며 요일 인덱스는 0=월,1=화,2=수,3=목,4=금 (총 5개), ' +
    '교시 인덱스는 0~7 (1교시,2교시,3교시,4교시,점심,5교시,6교시,7교시 순, 총 8개)입니다. ' +
    '각 칸의 값은 "과목(선생님이름)" 형식 문자열(예: "수학(홍민지)")로, 수업이 없으면 null로 채우세요. ' +
    '점심 열(인덱스 4)은 일반적으로 null입니다. 읽을 수 없는 칸은 null로 두세요.';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '서버에 ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.' });
    return;
  }

  const { mode, imageB64, imageMime, grade, classNum } = req.body || {};
  if (mode !== 'teacher' && mode !== 'class') {
    res.status(400).json({ error: "mode는 'teacher' 또는 'class'여야 합니다." });
    return;
  }
  if (!imageB64 || !imageMime) {
    res.status(400).json({ error: '이미지가 없습니다.' });
    return;
  }
  if (mode === 'class' && (!grade || !classNum)) {
    res.status(400).json({ error: '반 시간표는 학년·반이 필요합니다.' });
    return;
  }

  const schema = {
    type: 'object', additionalProperties: false, required: ['schedule'],
    properties: {
      schedule: {
        type: 'array',
        items: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
      },
    },
  };

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        output_config: { format: { type: 'json_schema', schema } },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageB64 } },
            { type: 'text', text: buildInstruction(mode, grade, classNum) },
          ],
        }],
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({ error: data?.error?.message || `HTTP ${anthropicRes.status}` });
      return;
    }

    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) {
      res.status(502).json({ error: '응답에서 결과를 찾지 못했습니다.' });
      return;
    }

    let result;
    try { result = JSON.parse(textBlock.text); }
    catch { res.status(502).json({ error: '결과 JSON 파싱 실패. 다시 시도하세요.' }); return; }

    res.status(200).json({ schedule: result.schedule });
  } catch (err) {
    res.status(502).json({ error: `네트워크 오류: ${err.message}` });
  }
};
