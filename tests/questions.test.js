import { describe, it, expect } from 'vitest'
import { QUESTIONS, YEARS, HRS, MINS, hrLabel } from '../data/questions'

describe('data/questions 기본 검증', () => {
  it('QUESTIONS 배열이 비어있지 않다', () => {
    expect(QUESTIONS.length).toBeGreaterThan(0)
  })

  it('모든 질문에 id가 있다', () => {
    QUESTIONS.forEach((q) => {
      expect(q.id).toBeDefined()
    })
  })

  it('YEARS 배열이 생성된다', () => {
    expect(YEARS.length).toBe(70)
    expect(YEARS[0]).toBe('2007년')
  })

  it('HRS는 0~23 시간 배열', () => {
    expect(HRS).toEqual(Array.from({ length: 24 }, (_, i) => i))
  })

  it('MINS는 00, 30', () => {
    expect(MINS).toEqual(['00', '30'])
  })

  it('hrLabel이 시간대 레이블을 올바르게 반환한다', () => {
    expect(hrLabel(0)).toContain('자정')
    expect(hrLabel(3)).toContain('새벽')
    expect(hrLabel(9)).toContain('오전')
    expect(hrLabel(12)).toContain('정오')
    expect(hrLabel(15)).toContain('오후')
    expect(hrLabel(21)).toContain('저녁')
  })
})
