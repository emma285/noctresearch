import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { encryptToken, decryptToken, newOAuthState, verifyOAuthState } from '../lib/whoop/crypto'
import { buildAuthorizeUrl, mapSleep, mapRecovery, WHOOP_SCOPES } from '../lib/whoop/api'
import { createHmac } from 'node:crypto'
import { verifyWebhookSignature, planWebhookAction } from '../lib/whoop/webhook'
import { buildWhoopDays } from '../lib/whoop/days'

beforeAll(() => {
  process.env.WHOOP_TOKEN_ENC_KEY = randomBytes(32).toString('base64')
  process.env.WHOOP_CLIENT_ID = 'test-client'
  process.env.WHOOP_REDIRECT_URI = 'http://localhost:3000/api/whoop/callback'
})

describe('토큰 암호화 (AES-256-GCM)', () => {
  it('암호화 → 복호화하면 원래 값', () => {
    const enc = encryptToken('access-token-123')
    expect(enc).not.toContain('access-token-123')
    expect(decryptToken(enc)).toBe('access-token-123')
  })

  it('같은 값도 매번 다른 암호문 (IV 랜덤)', () => {
    expect(encryptToken('x')).not.toBe(encryptToken('x'))
  })

  it('암호문이 변조되면 복호화 실패', () => {
    const [v, iv, tag, ct] = encryptToken('secret').split(':')
    const bad = Buffer.from(ct, 'base64')
    bad[0] ^= 1
    expect(() => decryptToken([v, iv, tag, bad.toString('base64')].join(':'))).toThrow()
  })

  it('키가 32바이트가 아니면 에러', () => {
    const keep = process.env.WHOOP_TOKEN_ENC_KEY
    process.env.WHOOP_TOKEN_ENC_KEY = 'short'
    expect(() => encryptToken('x')).toThrow()
    process.env.WHOOP_TOKEN_ENC_KEY = keep
  })
})

describe('OAuth state', () => {
  it('정상 state + 같은 유저면 통과', () => {
    const { state, cookie } = newOAuthState('user_1')
    expect(state.length).toBeGreaterThanOrEqual(8)
    expect(verifyOAuthState(cookie, state, 'user_1')).toBe(true)
  })

  it('다른 유저 / 다른 state / 변조 쿠키 / 쿠키 없음은 거절', () => {
    const { state, cookie } = newOAuthState('user_1')
    expect(verifyOAuthState(cookie, state, 'user_2')).toBe(false)
    expect(verifyOAuthState(cookie, 'other-state', 'user_1')).toBe(false)
    expect(verifyOAuthState(cookie.replace('user_1', 'user_2'), state, 'user_2')).toBe(false)
    expect(verifyOAuthState(undefined, state, 'user_1')).toBe(false)
  })
})

describe('authorize URL', () => {
  it('필수 파라미터 + offline scope 포함', () => {
    const u = new URL(buildAuthorizeUrl('abcdefgh12'))
    expect(u.searchParams.get('response_type')).toBe('code')
    expect(u.searchParams.get('client_id')).toBe('test-client')
    expect(u.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/whoop/callback')
    expect(u.searchParams.get('state')).toBe('abcdefgh12')
    expect(u.searchParams.get('scope')).toBe(WHOOP_SCOPES)
    expect(WHOOP_SCOPES.split(' ')).toContain('offline')
  })
})

const scoredSleep = {
  id: 'a1b2c3d4-0000-0000-0000-000000000000', cycle_id: 93845, user_id: 10129,
  start: '2026-10-01T22:25:44.774Z', end: '2026-10-02T05:47:11.000Z',
  timezone_offset: '+09:00', nap: false, score_state: 'SCORED',
  score: {
    stage_summary: {
      total_in_bed_time_milli: 30272735, total_awake_time_milli: 1403507, total_no_data_time_milli: 0,
      total_light_sleep_time_milli: 14905851, total_slow_wave_sleep_time_milli: 6630370,
      total_rem_sleep_time_milli: 5879573, sleep_cycle_count: 3, disturbance_count: 12,
    },
    sleep_needed: {
      baseline_milli: 27395716, need_from_sleep_debt_milli: 352230,
      need_from_recent_strain_milli: 208595, need_from_recent_nap_milli: -12312,
    },
    respiratory_rate: 16.1, sleep_performance_percentage: 98,
    sleep_consistency_percentage: 90, sleep_efficiency_percentage: 91.7,
  },
}

describe('수면 변환', () => {
  it('SCORED면 값 채움 + sleep need 합산 + raw 보존', () => {
    const r = mapSleep(scoredSleep, 'a@b.com')
    expect(r.sleepId).toBe(scoredSleep.id)
    expect(r.userEmail).toBe('a@b.com')
    expect(r.swsMs).toBe(6630370)
    expect(r.remMs).toBe(5879573)
    expect(r.sleepEffPct).toBe(91.7)
    expect(r.sleepNeedMs).toBe(27395716 + 352230 + 208595 - 12312)
    expect(r.startTs).toBeInstanceOf(Date)
    expect(r.raw).toBe(scoredSleep)
  })

  it('SCORED 아니면 값은 null (행은 저장)', () => {
    const r = mapSleep({ ...scoredSleep, score_state: 'PENDING_SCORE', score: undefined }, 'a@b.com')
    expect(r.scoreState).toBe('PENDING_SCORE')
    expect(r.swsMs).toBeNull()
    expect(r.sleepEffPct).toBeNull()
    expect(r.sleepNeedMs).toBeNull()
    expect(r.startTs).toBeInstanceOf(Date)
  })
})

describe('회복 변환', () => {
  const rec = {
    cycle_id: 93845, sleep_id: scoredSleep.id, user_id: 10129, score_state: 'SCORED',
    score: { user_calibrating: false, recovery_score: 44, resting_heart_rate: 64, hrv_rmssd_milli: 31.81, spo2_percentage: 95.6, skin_temp_celsius: 33.7 },
  }

  it('SCORED면 HRV·RHR·recovery 채움', () => {
    const r = mapRecovery(rec, 'a@b.com')
    expect(r.cycleId).toBe(93845)
    expect(r.recoveryScore).toBe(44)
    expect(r.hrvRmssdMs).toBe(31.81)
    expect(r.restingHr).toBe(64)
  })

  it('UNSCORABLE이면 값 null', () => {
    const r = mapRecovery({ ...rec, score_state: 'UNSCORABLE', score: undefined }, 'a@b.com')
    expect(r.recoveryScore).toBeNull()
    expect(r.hrvRmssdMs).toBeNull()
  })
})

describe('웹훅 서명검증', () => {
  const secret = 'client-secret'
  const ts = '1760500000000'
  const body = JSON.stringify({ user_id: 10129, id: scoredSleep.id, type: 'sleep.updated', trace_id: 't-1' })
  const sig = createHmac('sha256', secret).update(ts + body).digest('base64')

  it('올바른 서명이면 통과', () => {
    expect(verifyWebhookSignature(body, ts, sig, secret)).toBe(true)
  })

  it('바디 변조 / 다른 timestamp / 다른 secret / 헤더 없음은 거절', () => {
    expect(verifyWebhookSignature(body.replace('10129', '99999'), ts, sig, secret)).toBe(false)
    expect(verifyWebhookSignature(body, '1760500000001', sig, secret)).toBe(false)
    expect(verifyWebhookSignature(body, ts, sig, 'other-secret')).toBe(false)
    expect(verifyWebhookSignature(body, null, sig, secret)).toBe(false)
    expect(verifyWebhookSignature(body, ts, null, secret)).toBe(false)
  })
})

describe('웹훅 이벤트 → 할 일', () => {
  const base = { user_id: 10129, id: scoredSleep.id, trace_id: 't-1' }

  it('sleep/recovery updated·deleted 매핑 (recovery id = 수면 UUID)', () => {
    expect(planWebhookAction({ ...base, type: 'sleep.updated' })).toEqual({ action: 'upsert_sleep', sleepId: scoredSleep.id })
    expect(planWebhookAction({ ...base, type: 'sleep.deleted' })).toEqual({ action: 'delete_sleep', sleepId: scoredSleep.id })
    expect(planWebhookAction({ ...base, type: 'recovery.updated' })).toEqual({ action: 'upsert_recovery', sleepId: scoredSleep.id })
    expect(planWebhookAction({ ...base, type: 'recovery.deleted' })).toEqual({ action: 'delete_recovery', sleepId: scoredSleep.id })
  })

  it('workout·모르는 타입·필드 누락은 무시', () => {
    expect(planWebhookAction({ ...base, type: 'workout.updated' }).action).toBe('ignore')
    expect(planWebhookAction({ ...base, type: 'cycle.updated' }).action).toBe('ignore')
    expect(planWebhookAction({ ...base, id: undefined, type: 'sleep.updated' }).action).toBe('ignore')
    expect(planWebhookAction({ ...base, user_id: undefined, type: 'sleep.updated' }).action).toBe('ignore')
    expect(planWebhookAction(null).action).toBe('ignore')
  })
})

describe('sleep need 합산 — 빈 값을 0으로 채우지 않음', () => {
  it('구성값 하나라도 없으면 null', () => {
    const { need_from_recent_nap_milli, ...partial } = scoredSleep.score.sleep_needed
    const r = mapSleep({ ...scoredSleep, score: { ...scoredSleep.score, sleep_needed: partial } }, 'a@b.com')
    expect(r.sleepNeedMs).toBeNull()
  })
})

describe('날짜별 데이터 상태 (기록 없음 / 계산 중 / 계산 불가 / 값 있음)', () => {
  // 기준 시각: 한국 10/16 12:00
  const now = new Date('2026-10-16T03:00:00Z')
  const sleep = (wakeDate, scoreState, extra = {}) => ({
    sleepId: 's-' + wakeDate, isNap: false, tzOffset: '+09:00', scoreState,
    startTs: new Date(`${wakeDate}T00:00:00+09:00`), endTs: new Date(`${wakeDate}T07:00:00+09:00`),
    lightMs: 3600000, swsMs: 3600000, remMs: 3600000, awakeMs: 600000, sleepEffPct: 90, sleepPerfPct: 80,
    ...extra,
  })
  const rec = (wakeDate, scoreState, extra = {}) => ({
    sleepId: 's-' + wakeDate, scoreState, recoveryScore: 50, hrvRmssdMs: 40, restingHr: 55, ...extra,
  })
  const byDate = (days) => Object.fromEntries(days.map((d) => [d.date, d]))

  it('기록 없는 날도 날짜가 빠지지 않고 기록 없음으로 들어감', () => {
    const days = buildWhoopDays([sleep('2026-10-13', 'SCORED'), sleep('2026-10-15', 'SCORED')], [], 4, now)
    expect(days.map((d) => d.date)).toEqual(['2026-10-13', '2026-10-14', '2026-10-15'])
    const d = byDate(days)['2026-10-14']
    expect(d.sleepState).toBe('none')
    expect(d.recState).toBe('none')
    expect(d.asleepMs).toBeNull()
    expect(d.recoveryScore).toBeNull()
  })

  it('오늘은 기록 있을 때만 포함 (아직 자는 중일 수 있음)', () => {
    expect(buildWhoopDays([sleep('2026-10-15', 'SCORED')], [], 3, now).map((d) => d.date))
      .toEqual(['2026-10-14', '2026-10-15'])
    expect(buildWhoopDays([sleep('2026-10-16', 'SCORED')], [], 3, now).map((d) => d.date))
      .toEqual(['2026-10-14', '2026-10-15', '2026-10-16'])
  })

  it('계산 중 / 계산 불가: 시간은 있고 값은 전부 null', () => {
    const days = byDate(buildWhoopDays(
      [sleep('2026-10-14', 'PENDING_SCORE'), sleep('2026-10-15', 'UNSCORABLE')],
      [rec('2026-10-14', 'PENDING_SCORE'), rec('2026-10-15', 'UNSCORABLE')], 3, now))
    expect(days['2026-10-14'].sleepState).toBe('pending')
    expect(days['2026-10-14'].recState).toBe('pending')
    expect(days['2026-10-15'].sleepState).toBe('unscorable')
    expect(days['2026-10-15'].recState).toBe('unscorable')
    for (const d of [days['2026-10-14'], days['2026-10-15']]) {
      expect(d.wakeMin).toBe(7 * 60)
      expect(d.asleepMs).toBeNull()
      expect(d.deepMs).toBeNull()
      expect(d.recoveryScore).toBeNull()
      expect(d.hrvMs).toBeNull()
    }
  })

  it('수면은 값 있음, 회복은 기록 없음 — 상태를 따로 가짐', () => {
    const d = buildWhoopDays([sleep('2026-10-15', 'SCORED')], [], 2, now).at(-1)
    expect(d.sleepState).toBe('scored')
    expect(d.recState).toBe('none')
    expect(d.asleepMs).toBe(3 * 3600000)
  })

  it('0은 0 그대로 (값 있음)', () => {
    const d = buildWhoopDays(
      [sleep('2026-10-15', 'SCORED', { remMs: 0, awakeMs: 0 })],
      [rec('2026-10-15', 'SCORED', { recoveryScore: 0 })], 2, now).at(-1)
    expect(d.remMs).toBe(0)
    expect(d.awakeMs).toBe(0)
    expect(d.recoveryScore).toBe(0)
    expect(d.asleepMs).toBe(2 * 3600000)
  })

  it('값 있음인데 단계 하나가 비면 총 수면시간은 null (0으로 채워 합산 안 함)', () => {
    const d = buildWhoopDays([sleep('2026-10-15', 'SCORED', { remMs: null })], [], 2, now).at(-1)
    expect(d.remMs).toBeNull()
    expect(d.asleepMs).toBeNull()
  })
})
