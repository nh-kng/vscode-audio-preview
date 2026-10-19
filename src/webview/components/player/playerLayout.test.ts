import { formatTime, skipSeconds } from "./playerComponent";

describe("player transport formatting", () => {
  test("uses five-second transport steps and hour timestamps", () => {
    expect(skipSeconds).toBe(5);
    expect(formatTime(5, 20)).toBe("00:05");
    expect(formatTime(65.9, 3600)).toBe("00:01:05");
    expect(formatTime(3665, 3665)).toBe("01:01:05");
  });
});
