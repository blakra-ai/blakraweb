import { describe, expect, it } from 'vitest'
import { STATIONS, chip, markerY, progressFrom, readout, stationY } from '../src/features/observatory/gauge'

describe('the depth gauge', () => {
  it('has ten stations, 01 at the top and 10 at the foot of the rule', () => {
    expect(STATIONS).toBe(10)
    expect(stationY(1, 900)).toBe(0)
    expect(stationY(10, 900)).toBe(900)
    expect(stationY(5, 900)).toBe(400)
  })

  it('clamps stations outside 1…10', () => {
    expect(stationY(0, 800)).toBe(0)
    expect(stationY(12, 800)).toBe(800)
  })

  it('places the marker by progress along the rule', () => {
    expect(markerY(0, 800)).toBe(0)
    expect(markerY(1, 800)).toBe(800)
    expect(markerY(0.5, 800)).toBe(400)
    expect(markerY(-1, 800)).toBe(0)
    expect(markerY(2, 800)).toBe(800)
  })

  it('reads progress and the station from the scroll between station tops', () => {
    const tops = [0, 900, 1800, 2700, 3600, 4500, 5400, 6300, 7200, 8100]
    expect(progressFrom(0, tops)).toEqual({ station: 1, progress: 0 })
    expect(progressFrom(450, tops).station).toBe(1)
    expect(progressFrom(450, tops).progress).toBeCloseTo(0.5 / 9)
    expect(progressFrom(2700, tops)).toEqual({ station: 4, progress: 3 / 9 })
    expect(progressFrom(9000, tops)).toEqual({ station: 10, progress: 1 })
    expect(progressFrom(100, [])).toEqual({ station: 1, progress: 0 })
  })

  it('writes the readouts with two digits', () => {
    expect(chip(1)).toBe('01 / 10')
    expect(chip(4)).toBe('04 / 10')
    expect(readout(1)).toBe('Station 01 / 10')
    expect(readout(3, 'Proof')).toBe('Station 03 / 10 · Proof')
  })
})
