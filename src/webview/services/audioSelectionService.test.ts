import AudioSelectionService from "./audioSelectionService";

describe("audioSelectionService", () => {
  test("starts empty and normalizes reverse ranges within duration", () => {
    const service = new AudioSelectionService(10);
    expect(service.selection).toBeNull();
    expect(service.hasSelection).toBe(false);

    service.setSelection(8, 2);

    expect(service.selection).toEqual({ startSeconds: 2, endSeconds: 8 });
    expect(service.hasSelection).toBe(true);
  });

  test("clamps ranges and clears zero-width selections", () => {
    const service = new AudioSelectionService(10);
    service.setSelection(-4, 14);
    expect(service.selection).toEqual({ startSeconds: 0, endSeconds: 10 });

    service.setSelection(5, 5);
    expect(service.selection).toBeNull();
    expect(service.hasSelection).toBe(false);
  });

  test("moves one boundary while preserving the opposite boundary", () => {
    const service = new AudioSelectionService(10);
    service.setSelection(2, 8);

    service.setBoundary("start", 5, 0.1);
    expect(service.selection).toEqual({ startSeconds: 5, endSeconds: 8 });

    service.setBoundary("end", 1, 0.1);
    expect(service.selection).toEqual({ startSeconds: 5, endSeconds: 5.1 });
  });

  test("clamps a dragged boundary before it can collapse the selection", () => {
    const service = new AudioSelectionService(10);
    service.setSelection(2, 8);

    service.setBoundary("start", 12, 0.25);
    expect(service.selection).toEqual({ startSeconds: 7.75, endSeconds: 8 });

    service.setBoundary("end", -2, 0.25);
    expect(service.selection).toEqual({ startSeconds: 7.75, endSeconds: 8 });
  });
});
