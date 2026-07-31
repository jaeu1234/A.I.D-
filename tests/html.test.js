import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/lib/html.js';

test('escapeHtml: 5대 특수문자를 모두 이스케이프', () => {
  assert.equal(escapeHtml(`<script>&"'</script>`), '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;');
});

test('escapeHtml: 특수문자 없는 일반 문자열은 그대로', () => {
  assert.equal(escapeHtml('류학철 선생님'), '류학철 선생님');
});

test('escapeHtml: 숫자·null도 문자열로 안전하게 변환', () => {
  assert.equal(escapeHtml(123), '123');
  assert.equal(escapeHtml(null), 'null');
});
