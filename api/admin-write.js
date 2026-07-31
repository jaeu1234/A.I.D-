// 임시일정·AI 시간표 쓰기를 대신 처리하는 서버리스 함수.
//
// 예전엔 admin.html/upload.html이 Supabase anon key로 overrides/ai_schedules를
// 직접 insert/update/delete했다. anon key는 브라우저에 공개되는 값이라, RLS가
// anon에게 쓰기를 허용하는 한 누구든 devtools 콘솔에서 같은 호출을 그대로
// 재현해 PIN 확인을 완전히 우회할 수 있었다(PIN은 화면 잠금일 뿐 DB 접근을
// 막지 못했다). 이제 쓰기는 이 함수가 PIN을 서버에서 검증한 뒤 service_role
// 키로만 수행하고(RLS는 supabase_schema.sql에서 anon 쓰기를 막도록 갱신됨),
// 브라우저는 이 함수 하나만 호출한다.
const { restRequest } = require('./_lib/supabaseAdmin');
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

  const { pin, action, payload } = req.body || {};
  if (pin !== adminPin) {
    res.status(401).json({ error: 'PIN이 올바르지 않습니다.' });
    return;
  }

  try {
    switch (action) {
      case 'addOverride': {
        const p = payload || {};
        const rows = await restRequest('overrides', {
          method: 'POST',
          extraHeaders: { Prefer: 'return=representation' },
          body: {
            teacher_id: p.teacherId,
            date: p.date,
            period_idx: p.periodIdx,
            label: p.label,
            room: p.room,
            floor: p.floor,
            note: p.note || null,
          },
        });
        res.status(200).json({ row: rows[0] });
        return;
      }

      case 'deleteOverride': {
        const id = (payload || {}).id;
        await restRequest(`overrides?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        res.status(200).json({ ok: true });
        return;
      }

      case 'saveAiSchedule': {
        const p = payload || {};
        const updatedAt = new Date().toISOString();
        await restRequest('ai_schedules', {
          method: 'POST',
          extraHeaders: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: { teacher_id: p.teacherId, schedule: p.schedule, updated_at: updatedAt },
        });
        res.status(200).json({ ok: true, updatedAt });
        return;
      }

      case 'saveClassAiSchedule': {
        const p = payload || {};
        const updatedAt = new Date().toISOString();
        await restRequest('class_ai_schedules', {
          method: 'POST',
          extraHeaders: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: { class_id: p.classId, schedule: p.schedule, updated_at: updatedAt },
        });
        res.status(200).json({ ok: true, updatedAt });
        return;
      }

      default:
        res.status(400).json({ error: '알 수 없는 action입니다.' });
    }
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};
