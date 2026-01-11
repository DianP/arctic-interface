import { describe, expect, test } from "bun:test"
import { DoubleClick } from "@tui/util/double-click"

describe("DoubleClick", () => {
  describe("create", () => {
    test("detects double click within threshold", () => {
      const detector = DoubleClick.create()

      const now = Date.now()
      const firstClick = detector.handleClick(10, 20, now)
      expect(firstClick).toBe(false)

      const secondClick = detector.handleClick(10, 20, now + 200)
      expect(secondClick).toBe(true)
    })

    test("does not detect double click after threshold", () => {
      const detector = DoubleClick.create()

      const now = Date.now()
      const firstClick = detector.handleClick(10, 20, now)
      expect(firstClick).toBe(false)

      const secondClick = detector.handleClick(10, 20, now + 500)
      expect(secondClick).toBe(false)
    })

    test("does not detect double click at different positions", () => {
      const detector = DoubleClick.create()

      const now = Date.now()
      const firstClick = detector.handleClick(10, 20, now)
      expect(firstClick).toBe(false)

      const secondClick = detector.handleClick(15, 25, now + 200)
      expect(secondClick).toBe(false)
    })

    test("allows small position difference", () => {
      const detector = DoubleClick.create()

      const now = Date.now()
      const firstClick = detector.handleClick(10, 20, now)
      expect(firstClick).toBe(false)

      const secondClick = detector.handleClick(11, 21, now + 200)
      expect(secondClick).toBe(true)
    })

    test("reset clears click history", () => {
      const detector = DoubleClick.create()

      const now = Date.now()
      detector.handleClick(10, 20, now)
      detector.reset()

      const secondClick = detector.handleClick(10, 20, now + 200)
      expect(secondClick).toBe(false)
    })
  })

  describe("createMultiClick", () => {
    test("counts successive clicks within threshold", () => {
      const detector = DoubleClick.createMultiClick()

      const now = Date.now()
      expect(detector.handleClick(10, 20, now)).toBe(1)
      expect(detector.handleClick(10, 20, now + 150)).toBe(2)
      expect(detector.handleClick(10, 20, now + 300)).toBe(3)
    })

    test("resets count when timing exceeds threshold", () => {
      const detector = DoubleClick.createMultiClick()

      const now = Date.now()
      expect(detector.handleClick(10, 20, now)).toBe(1)
      expect(detector.handleClick(10, 20, now + 500)).toBe(1)
    })

    test("resets count when position changes too much", () => {
      const detector = DoubleClick.createMultiClick()

      const now = Date.now()
      expect(detector.handleClick(10, 20, now)).toBe(1)
      expect(detector.handleClick(20, 30, now + 200)).toBe(1)
    })
  })
})
