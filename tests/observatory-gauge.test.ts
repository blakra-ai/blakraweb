import { describe, expect, it } from 'vitest'
import { STATIONS, chip, markerY, progressFrom, readout, stationY } from '../src/features/observatory/gauge'

describe('the depth gauge', () => {
  it('has nine stations, 01 at the top and 09 at the foot of the rule', () => {
    expect(STATIONS).toBe(9)
    expect(stationY(1, 800)).toBe(0)
    expect(stationY(9, 800)).toBe(800)
    expect(stationY(5, 800)).toBe(400)
  })

  it('clamps stations outside 1…9', () => {
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
    const tops = [0, 900, 1800, 2700, 3600, 4500, 5400, 6300, 7200]
    expect(progressFrom(0, tops)).toEqual({ station: 1, progress: 0 })
    expect(progressFrom(450, tops)).toEqual({ station: 1, progress: 0.0625 })
    expect(progressFrom(2700, tops)).toEqual({ station: 4, progress: 0.375 })
    expect(progressFrom(9000, tops)).toEqual({ station: 9, progress: 1 })
    expect(progressFrom(100, [])).toEqual({ station: 1, progress: 0 })
  })

  it('writes the readouts with two digits', () => {
    expect(chip(1)).toBe('01 / 09')
    expect(chip(4)).toBe('04 / 09')
    expect(readout(1)).toBe('Station 01 / 09')
    expect(readout(3, 'Proof')).toBe('Station 03 / 09 · Proof')
  })
})
