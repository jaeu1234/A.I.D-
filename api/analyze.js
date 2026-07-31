// Vercel 서버리스 함수 (Node.js 런타임, 빌드 도구 불필요 — /api/*.js는 자동 감지됨).
//
// upload.html이 시간표 사진을 AI API로 직접 보내던 방식은 API 키를 브라우저
// localStorage에 저장하고 요청 헤더에 실어 보내야 해서, 같은 기기를 쓰는 다른
// 사람이 devtools로 키를 그대로 읽어갈 수 있었다. 이 함수가 대신 호출을 중계해서
// 키가 서버 환경변수(OPENAI_API_KEY)에만 존재하게 한다.
//
// 배포 시 Vercel 프로젝트 설정 → Environment Variables에 OPENAI_API_KEY를
// 등록해야 동작한다.

const { readKey } = require('./_lib/env');

// gpt-5도 이 요청 형식(vision + structured outputs)을 지원하지만, 빈 이미지
// 하나에도 12초 넘게 걸려 실제 시간표 사진에서는 함수 실행 시간 제한에 걸린다.
// gpt-4.1은 같은 요청에 2초대라 여유가 크고 표 OCR 정확도도 충분하다.
const MODEL = 'gpt-4.1';

// 시간표 한 장을 다 채우면 40칸이라 넉넉히 잡는다.
const MAX_OUTPUT_TOKENS = 4096;

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

// OpenAI structured outputs(strict)는 모든 object에 additionalProperties:false와
// 전체 속성의 required를 요구한다. null 허용은 type 배열로 표현한다.
const SCHEDULE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schedule'],
  properties: {
    schedule: {
      type: 'array',
      items: { type: 'array', items: { type: ['string', 'null'] } },
    },
  },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다.' });
    return;
  }

  // readKey는 값에 섞여 들어온 BOM·공백을 걷어낸다 — 그대로 헤더에 넣으면 fetch가
  // ByteString 변환 오류로 요청을 거부하고 원인 없는 502만 남는다(_lib/env.js 참고).
  let apiKey, adminPin;
  try {
    apiKey = readKey('OPENAI_API_KEY');
    adminPin = readKey('ADMIN_PIN');
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  // upload.html의 PIN 게이트는 UI만 막을 뿐, 이 검증이 없으면 누구나 PIN 없이
  // 직접 이 엔드포인트를 호출해 유료 API를 무제한으로 소모할 수 있었다
  // (admin-write.js/verify-pin.js와 동일한 서버측 재검증 패턴을 여기도 적용).
  const { pin, mode, imageB64, imageMime, grade, classNum } = req.body || {};
  if (pin !== adminPin) {
    res.status(401).json({ error: 'PIN이 올바르지 않습니다.' });
    return;
  }
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

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'timetable', strict: true, schema: SCHEDULE_SCHEMA },
        },
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: buildInstruction(mode, grade, classNum) },
            // detail:'high'라야 표 안의 작은 글씨까지 읽는다(기본값은 축소본만 본다).
            {
              type: 'image_url',
              image_url: { url: `data:${imageMime};base64,${imageB64}`, detail: 'high' },
            },
          ],
        }],
      }),
    });

    const data = await openaiRes.json();
    if (!openaiRes.ok) {
      res.status(openaiRes.status).json({ error: data?.error?.message || `HTTP ${openaiRes.status}` });
      return;
    }

    const choice = data.choices?.[0];
    // 모델이 응답을 거부하면 content가 비고 refusal에 사유가 담긴다.
    if (choice?.message?.refusal) {
      res.status(502).json({ error: `분석이 거부되었습니다: ${choice.message.refusal}` });
      return;
    }
    // 토큰이 모자라 잘리면 JSON이 깨진 채로 온다 — 파싱 실패보다 원인이 분명한 메시지를 준다.
    if (choice?.finish_reason === 'length') {
      res.status(502).json({ error: '응답이 너무 길어 잘렸습니다. 사진을 나눠서 올려보세요.' });
      return;
    }

    const content = choice?.message?.content;
    if (!content) {
      res.status(502).json({ error: '응답에서 결과를 찾지 못했습니다.' });
      return;
    }

    let result;
    try { result = JSON.parse(content); }
    catch { res.status(502).json({ error: '결과 JSON 파싱 실패. 다시 시도하세요.' }); return; }

    res.status(200).json({ schedule: result.schedule });
  } catch (err) {
    res.status(502).json({ error: `네트워크 오류: ${err.message}` });
  }
};
