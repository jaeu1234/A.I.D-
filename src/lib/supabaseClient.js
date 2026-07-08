import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 공개 프로젝트 URL·anon key. RLS 정책으로 접근 범위를 제어하므로
// 브라우저에 노출돼도 되는 값이다 (service_role 키와는 다름).
const SUPABASE_URL = 'https://iuydyigpsqqvpngbdzmm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aCKnCBf0ipmLKnJNzvcFQQ_n2bi_xgp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
