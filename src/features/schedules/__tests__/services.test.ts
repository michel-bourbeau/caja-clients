import { ScheduleService } from "../services";
import type { EmployeeSchedule, TimeEntry } from "@/lib/types";

// ─── Fixed date: Tuesday April 28, 2026 ──────────────────────────────────────
// getDay() = 2 → formula (today === 0 ? 6 : today - 1) = 1
const FIXED_DATE = new Date("2026-04-28T12:00:00Z");
const TODAY_FORMULA = FIXED_DATE.getDay() === 0 ? 6 : FIXED_DATE.getDay() - 1; // 1

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_DATE);
});

afterAll(() => {
  jest.useRealTimers();
});

// ─── setSchedule ─────────────────────────────────────────────────────────────

describe("ScheduleService.setSchedule", () => {
  it("retourne un objet EmployeeSchedule avec les bons champs", async () => {
    const result = await ScheduleService.setSchedule("emp-1", 1, "08:00", "17:00", true);
    expect(result).toMatchObject<Partial<EmployeeSchedule>>({
      employeeId: "emp-1",
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "17:00",
      isWorking: true,
    });
    expect(result.id).toBeDefined();
  });

  it("crée un ID unique à chaque appel", async () => {
    const a = await ScheduleService.setSchedule("emp-1", 0, "08:00", "16:00", true);
    const b = await ScheduleService.setSchedule("emp-1", 0, "08:00", "16:00", true);
    expect(a.id).not.toBe(b.id);
  });
});

// ─── checkIn ────────────────────────────────────────────────────────────────

describe("ScheduleService.checkIn", () => {
  it("retourne un TimeEntry avec l'employeeId et une checkInTime", async () => {
    const entry = await ScheduleService.checkIn("emp-2");
    expect(entry.employeeId).toBe("emp-2");
    expect(entry.checkInTime).toBeInstanceOf(Date);
    expect(entry.id).toBeDefined();
  });

  it("ne contient pas de checkOutTime à l'entrée", async () => {
    const entry = await ScheduleService.checkIn("emp-2");
    expect(entry.checkOutTime).toBeUndefined();
  });
});

// ─── checkOut ───────────────────────────────────────────────────────────────

describe("ScheduleService.checkOut", () => {
  it("retourne un TimeEntry avec le bon ID et une checkOutTime", async () => {
    const entry = await ScheduleService.checkOut("TE-EXISTING");
    expect(entry.id).toBe("TE-EXISTING");
    expect(entry.checkOutTime).toBeInstanceOf(Date);
  });
});

// ─── calculateTotalHours ─────────────────────────────────────────────────────

describe("ScheduleService.calculateTotalHours", () => {
  const makeEntry = (inHour: number, outHour: number | null): TimeEntry => ({
    id: `e-${inHour}`,
    employeeId: "emp-1",
    checkInTime: new Date(`2026-04-28T${String(inHour).padStart(2, "0")}:00:00Z`),
    checkOutTime: outHour !== null
      ? new Date(`2026-04-28T${String(outHour).padStart(2, "0")}:00:00Z`)
      : undefined,
    date: FIXED_DATE,
  });

  it("retourne 0 pour une liste vide", () => {
    expect(ScheduleService.calculateTotalHours([])).toBe(0);
  });

  it("calcule les heures d'une seule entrée complète", () => {
    const entries = [makeEntry(8, 16)]; // 8h
    expect(ScheduleService.calculateTotalHours(entries)).toBeCloseTo(8, 5);
  });

  it("ignore les entrées sans checkOutTime", () => {
    const entries = [makeEntry(8, 16), makeEntry(17, null)];
    expect(ScheduleService.calculateTotalHours(entries)).toBeCloseTo(8, 5);
  });

  it("additionne plusieurs entrées", () => {
    const entries = [makeEntry(8, 12), makeEntry(13, 17)]; // 4 + 4 = 8h
    expect(ScheduleService.calculateTotalHours(entries)).toBeCloseTo(8, 5);
  });

  it("gère les fractions d'heures (30 min = 0.5h)", () => {
    const entries = [makeEntry(8, 9)]; // 1h
    // Manually create a 30-min entry
    const halfHour: TimeEntry = {
      id: "half",
      employeeId: "emp-1",
      checkInTime: new Date("2026-04-28T10:00:00Z"),
      checkOutTime: new Date("2026-04-28T10:30:00Z"),
      date: FIXED_DATE,
    };
    expect(ScheduleService.calculateTotalHours([...entries, halfHour])).toBeCloseTo(1.5, 5);
  });
});

// ─── isScheduledToday ────────────────────────────────────────────────────────

describe("ScheduleService.isScheduledToday", () => {
  const mkSchedule = (dayOfWeek: number, isWorking: boolean): EmployeeSchedule => ({
    id: "SCH-1",
    employeeId: "emp-1",
    dayOfWeek,
    startTime: "08:00",
    endTime: "17:00",
    isWorking,
  });

  it("retourne true pour le jour courant (formule) avec isWorking=true", () => {
    expect(ScheduleService.isScheduledToday(mkSchedule(TODAY_FORMULA, true))).toBe(true);
  });

  it("retourne false si isWorking=false même pour le bon jour", () => {
    expect(ScheduleService.isScheduledToday(mkSchedule(TODAY_FORMULA, false))).toBe(false);
  });

  it("retourne false pour un autre jour", () => {
    const otherDay = (TODAY_FORMULA + 2) % 7;
    expect(ScheduleService.isScheduledToday(mkSchedule(otherDay, true))).toBe(false);
  });
});

// ─── getDaySchedule ───────────────────────────────────────────────────────────

describe("ScheduleService.getDaySchedule", () => {
  const SCHEDULES: EmployeeSchedule[] = [
    { id: "s1", employeeId: "e1", dayOfWeek: 1, startTime: "08:00", endTime: "17:00", isWorking: true },
    { id: "s2", employeeId: "e2", dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isWorking: false },
    { id: "s3", employeeId: "e3", dayOfWeek: 3, startTime: "08:00", endTime: "17:00", isWorking: true },
  ];

  it("retourne seulement les horaires du jour demandé avec isWorking=true", () => {
    const result = ScheduleService.getDaySchedule(SCHEDULES, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("retourne une liste vide si aucun horaire pour ce jour", () => {
    expect(ScheduleService.getDaySchedule(SCHEDULES, 5)).toEqual([]);
  });

  it("exclut les entrées isWorking=false", () => {
    const onlyInactive: EmployeeSchedule[] = [
      { id: "s4", employeeId: "e4", dayOfWeek: 2, startTime: "08:00", endTime: "17:00", isWorking: false },
    ];
    expect(ScheduleService.getDaySchedule(onlyInactive, 2)).toEqual([]);
  });
});

// ─── generateScheduleId ──────────────────────────────────────────────────────

describe("ScheduleService.generateScheduleId", () => {
  it("commence par 'SCH-'", () => {
    expect(ScheduleService.generateScheduleId()).toMatch(/^SCH-/);
  });

  it("génère des IDs uniques à chaque appel", () => {
    const ids = new Set(Array.from({ length: 10 }, () => ScheduleService.generateScheduleId()));
    expect(ids.size).toBe(10);
  });
});

// ─── generateTimeEntryId ──────────────────────────────────────────────────────

describe("ScheduleService.generateTimeEntryId", () => {
  it("commence par 'TE-'", () => {
    expect(ScheduleService.generateTimeEntryId()).toMatch(/^TE-/);
  });

  it("génère des IDs uniques à chaque appel", () => {
    const ids = new Set(Array.from({ length: 10 }, () => ScheduleService.generateTimeEntryId()));
    expect(ids.size).toBe(10);
  });
});
