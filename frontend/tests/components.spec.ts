import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import AppHeader from "../src/components/AppHeader.vue";
import SegmentsEditor from "../src/components/SegmentsEditor.vue";
import TimesheetTable from "../src/components/TimesheetTable.vue";
import DayRow from "../src/components/DayRow.vue";
import App from "../src/App.vue";
import { useTimeStore } from "../src/store/timeStore";

const createStore = () => {
  setActivePinia(createPinia());
  const store = useTimeStore();
  store.days = [{ date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, segments: [] }];
  store.summary = {
    todayBalanceMinutes: 0,
    globalBalanceMinutes: 30,
    teleworkUsed: 1,
    teleworkRemaining: 99
  };
  store.updateDay = vi.fn();
  store.loadDays = vi.fn();
  store.loadSummary = vi.fn();
  return store;
};

const buildPunches = (date: string, segments: { start: string; end: string }[]) =>
  segments.flatMap((segment) => [
    { kind: "IN", timestamp: `${date}T${segment.start}:00.000Z` },
    { kind: "OUT", timestamp: `${date}T${segment.end}:00.000Z` }
  ]);

describe("components", () => {
  it("renders AppHeader", () => {
    const wrapper = mount(AppHeader, {
      props: {
        summary: {
          todayBalanceMinutes: 10,
          globalBalanceMinutes: 20,
          teleworkUsed: 2,
          teleworkRemaining: 98
        },
        vacationRemaining: 12,
        rttRemaining: 6,
        teleworkPerWeek: 3,
        showArchived: false
      }
    });
    expect(wrapper.text()).toContain("Solde global");
  });

  it("emits toolbar actions and shows archived title", async () => {
    const wrapper = mount(AppHeader, {
      props: {
        summary: {
          todayBalanceMinutes: -10,
          globalBalanceMinutes: -20,
          teleworkUsed: 2,
          teleworkRemaining: 98
        },
        vacationRemaining: 12,
        rttRemaining: 6,
        teleworkPerWeek: 3,
        showArchived: true
      }
    });

    const buttons = wrapper.findAll("button");
    await buttons[0].trigger("click");
    await buttons[1].trigger("click");
    await buttons[2].trigger("click");
    await buttons[3].trigger("click");

    expect(wrapper.emitted()).toHaveProperty("archive");
    expect(wrapper.emitted()).toHaveProperty("toggle-archived");
    expect(wrapper.emitted()).toHaveProperty("import");
    expect(wrapper.emitted()).toHaveProperty("export");
    expect(buttons[1].attributes("title")).toContain("Masquer");
  });

  it("adds segment in SegmentsEditor", async () => {
    const wrapper = mount(SegmentsEditor, { props: { modelValue: [] } });
    await wrapper.find("button").trigger("click");
    const emits = wrapper.emitted("update:modelValue");
    expect(emits?.[0][0]).toEqual([{ start: "08:00", end: "08:00" }]);
  });

  it("adds segment using last end time", async () => {
    const wrapper = mount(SegmentsEditor, {
      props: { modelValue: [{ start: "08:00", end: "10:15" }] }
    });
    const buttons = wrapper.findAll("button");
    await buttons[buttons.length - 1].trigger("click");
    const emits = wrapper.emitted("update:modelValue");
    expect(emits?.[0][0][1]).toEqual({ start: "10:15", end: "10:15" });
  });

  it("updates segment values in SegmentsEditor", async () => {
    const wrapper = mount(SegmentsEditor, {
      props: { modelValue: [{ start: "08:00", end: "09:00" }] }
    });
    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("08:30");
    const emits = wrapper.emitted("update:modelValue");
    expect(emits?.[0][0][0].start).toBe("08:30");
  });

  it("updates segment end time", async () => {
    const wrapper = mount(SegmentsEditor, {
      props: { modelValue: [{ start: "08:00", end: "09:00" }] }
    });
    const inputs = wrapper.findAll("input");
    await inputs[1].setValue("09:30");
    const emits = wrapper.emitted("update:modelValue");
    expect(emits?.[0][0][0].end).toBe("09:30");
  });

  it("updates one segment without touching others", async () => {
    const wrapper = mount(SegmentsEditor, {
      props: {
        modelValue: [
          { start: "08:00", end: "09:00" },
          { start: "10:00", end: "11:00" }
        ]
      }
    });
    const inputs = wrapper.findAll("input");
    await inputs[2].setValue("10:30");
    const emits = wrapper.emitted("update:modelValue");
    expect(emits?.[0][0][0].start).toBe("08:00");
    expect(emits?.[0][0][1].start).toBe("10:30");
  });

  it("removes segment in SegmentsEditor", async () => {
    const wrapper = mount(SegmentsEditor, {
      props: {
        modelValue: [
          { start: "08:00", end: "09:00" },
          { start: "10:00", end: "11:00" }
        ]
      }
    });
    const buttons = wrapper.findAll("button");
    await buttons[0].trigger("click");
    const emits = wrapper.emitted("update:modelValue");
    expect(emits?.[0][0]).toEqual([{ start: "10:00", end: "11:00" }]);
  });

  it("renders TimesheetTable", () => {
    const wrapper = mount(TimesheetTable, {
      props: {
        days: [{ date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, segments: [] }],
        selectedDates: new Set()
      },
      global: {
        stubs: {
          DayRow: true
        }
      }
    });
    expect(wrapper.text()).toContain("Date");
  });

  it("re-emits row selection from TimesheetTable", async () => {
    const wrapper = mount(TimesheetTable, {
      props: {
        days: [{ date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, segments: [] }],
        selectedDates: new Set()
      },
      global: {
        stubs: {
          DayRow: {
            template: "<tr><td><button @click=\"$emit('toggle-select', '2026-01-10', true)\">x</button></td></tr>"
          }
        }
      }
    });

    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("toggle-select")?.[0]).toEqual(["2026-01-10", true]);
  });

  it("edits DayRow for non-today", async () => {
    const store = createStore();
    store.days = [
      { date: "2026-01-09", dayType: "NORMAL", telework: false, archived: false, segments: [] },
      { date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, segments: [] }
    ];

    const wrapper = mount(DayRow, {
      props: { day: store.days[0], selected: false },
      global: {
        stubs: {
          teleport: true
        }
      }
    });

    await wrapper.find("button").trigger("click");
    const buttons = wrapper.findAll("button");
    const saveButton = buttons.find((button) => button.text() === "Enregistrer");
    if (!saveButton) {
      throw new Error("Save button not found");
    }
    await saveButton.trigger("click");
    expect(store.updateDay).toHaveBeenCalled();
  });

  it("renders weekend row and emits selection", async () => {
    const store = createStore();
    const day = {
      date: "2026-01-10",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      segments: [],
      punches: []
    };
    store.days = [day];
    const wrapper = mount(DayRow, { props: { day, selected: false } });
    await wrapper.find("input[type='checkbox']").setValue(true);
    expect(wrapper.emitted("toggle-select")?.[0]).toEqual(["2026-01-10", true]);
    expect(wrapper.text()).toContain("Sa");
  });

  it("renders holiday row label", () => {
    const store = createStore();
    const day = {
      date: "2026-01-06",
      dayType: "HOLIDAY",
      telework: false,
      archived: false,
      segments: [],
      punches: []
    };
    store.days = [day];
    const wrapper = mount(DayRow, { props: { day, selected: false } });
    expect(wrapper.text()).toContain("Férié");
  });

  it("shows telework icon and positive balance", () => {
    const store = createStore();
    const segments = [
      { start: "07:00", end: "12:00" },
      { start: "12:30", end: "17:30" }
    ];
    const day = {
      date: "2026-01-08",
      dayType: "NORMAL",
      telework: true,
      archived: false,
      segments,
      punches: buildPunches("2026-01-08", segments)
    };
    store.days = [day];
    const wrapper = mount(DayRow, { props: { day, selected: false } });
    expect(wrapper.find("svg").exists()).toBe(true);
    expect(wrapper.find("td.text-emerald-600").exists()).toBe(true);
  });

  it("shows negative balance in red", () => {
    const store = createStore();
    const segments = [
      { start: "07:00", end: "11:00" },
      { start: "12:30", end: "14:30" }
    ];
    const day = {
      date: "2026-01-07",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      segments,
      punches: buildPunches("2026-01-07", segments)
    };
    store.days = [day];
    const wrapper = mount(DayRow, { props: { day, selected: false } });
    expect(wrapper.find("td.text-red-600").exists()).toBe(true);
  });

  it("shows TRIP balance as zero", () => {
    const store = createStore();
    const day = {
      date: "2026-01-08",
      dayType: "TRIP",
      telework: false,
      archived: false,
      segments: [],
      punches: []
    };
    store.days = [day];
    const wrapper = mount(DayRow, { props: { day, selected: false } });
    expect(wrapper.text()).toContain("+00:00");
  });

  it("renders custom day type with fallback label", () => {
    const store = createStore();
    const day = {
      date: "2026-01-08",
      dayType: "CUSTOM" as any,
      telework: false,
      archived: false,
      segments: [],
      punches: []
    };
    store.days = [day];
    const wrapper = mount(DayRow, { props: { day, selected: false } });
    expect(wrapper.text()).toContain("CUSTOM");
  });

  it("exposes normal day type label and badge class", () => {
    const store = createStore();
    const day = {
      date: "2026-01-09",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      segments: [],
      punches: []
    };
    store.days = [day];
    const wrapper = mount(DayRow, { props: { day, selected: false } });
    const vm = wrapper.vm as any;
    expect(vm.dayTypeLabel).toBe("Normal");
    expect(vm.dayTypeBadgeClass).toContain("bg-slate-100");
  });

  it("renders vacation, rtt and other badges", () => {
    const store = createStore();
    const types = ["VACATION", "RTT", "OTHER"] as const;
    types.forEach((dayType) => {
      const day = {
        date: "2026-01-09",
        dayType,
        telework: false,
        archived: false,
        segments: [],
        punches: []
      };
      store.days = [day as any];
      const wrapper = mount(DayRow, { props: { day: day as any, selected: false } });
      const expected =
        dayType === "VACATION" ? "Conges" : dayType === "OTHER" ? "Autre" : dayType;
      expect(wrapper.text()).toContain(expected);
    });
  });

  it("marks incomplete punches as incomplete day", () => {
    const store = createStore();
    const day = {
      date: "2026-01-07",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      segments: [],
      punches: [{ kind: "OUT", timestamp: "2026-01-07T08:00:00.000Z" }]
    };
    store.days = [day];
    const wrapper = mount(DayRow, { props: { day, selected: false } });
    expect(wrapper.find("tr").classes()).toContain("bg-orange-50");
  });

  it("marks wrong punch order as incomplete", () => {
    const store = createStore();
    const day = {
      date: "2026-01-07",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      segments: [],
      punches: [
        { kind: "OUT", timestamp: "2026-01-07T10:00:00.000Z" },
        { kind: "IN", timestamp: "2026-01-07T11:00:00.000Z" }
      ]
    };
    store.days = [day];
    const wrapper = mount(DayRow, { props: { day, selected: false } });
    expect(wrapper.find("tr").classes()).toContain("bg-orange-50");
  });

  it("renders DayRow for non-normal day", () => {
    createStore();
    const wrapper = mount(DayRow, {
      props: { day: { date: "2026-01-08", dayType: "SICK", telework: false, archived: false, segments: [] }, selected: false }
    });
    expect(wrapper.text()).toContain("Maladie");
  });

  it("saves non-normal day with empty segments", async () => {
    const store = createStore();
    const segments = [
      { start: "08:00", end: "10:00" },
      { start: "11:00", end: "12:00" }
    ];
    const day = {
      date: "2026-01-12",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      segments,
      punches: buildPunches("2026-01-12", segments)
    };
    store.days = [day];

    const wrapper = mount(DayRow, {
      props: { day, selected: false },
      global: {
        stubs: {
          teleport: true
        }
      }
    });

    await wrapper.find("button").trigger("click");
    const select = wrapper.find("select");
    await select.setValue("SICK");
    const saveButton = wrapper.findAll("button").find((button) => button.text() === "Enregistrer");
    if (!saveButton) {
      throw new Error("Save button not found");
    }
    await saveButton.trigger("click");
    expect(store.updateDay).toHaveBeenCalledWith(
      "2026-01-12",
      "SICK",
      false,
      false,
      [],
      []
    );
  });

  it("saves normal day segments and closes modal", async () => {
    const store = createStore();
    const segments = [
      { start: "07:00", end: "12:00" },
      { start: "12:30", end: "15:00" }
    ];
    const day = {
      date: "2026-01-13",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      segments,
      punches: buildPunches("2026-01-13", segments)
    };
    store.days = [day];

    const wrapper = mount(DayRow, {
      props: { day, selected: false },
      global: {
        stubs: { teleport: true }
      }
    });

    await wrapper.find("button").trigger("click");
    const saveButton = wrapper.findAll("button").find((button) => button.text() === "Enregistrer");
    if (!saveButton) {
      throw new Error("Save button not found");
    }
    await saveButton.trigger("click");
    expect(store.updateDay).toHaveBeenCalledWith(
      "2026-01-13",
      "NORMAL",
      false,
      false,
      expect.any(Array),
      expect.any(Array)
    );
  });

  it("closes modal on cancel", async () => {
    const store = createStore();
    const day = {
      date: "2026-01-14",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      segments: [],
      punches: []
    };
    store.days = [day];

    const wrapper = mount(DayRow, {
      props: { day, selected: false },
      global: {
        stubs: { teleport: true }
      }
    });

    await wrapper.find("button").trigger("click");
    const cancelButton = wrapper.findAll("button").find((button) => button.text() === "Annuler");
    if (!cancelButton) {
      throw new Error("Cancel button not found");
    }
    await cancelButton.trigger("click");
    expect(wrapper.text()).not.toContain("Saisie des periodes");
  });

  it("covers DayRow helper methods", async () => {
    const store = createStore();
    const segments = [
      { start: "07:00", end: "11:30" },
      { start: "12:00", end: "15:00" },
      { start: "15:30", end: "18:00" }
    ];
    const day = {
      date: "2026-01-15",
      dayType: "NORMAL",
      telework: false,
      archived: false,
      segments,
      punches: buildPunches("2026-01-15", segments)
    };
    store.days = [day];
    const wrapper = mount(DayRow, {
      props: { day, selected: false },
      global: {
        stubs: { teleport: true }
      }
    });
    const vm = wrapper.vm as any;
    expect(vm.toMinutes("08:30")).toBe(510);
    expect(vm.sumMinutes([{ start: "10:00", end: "09:00" }])).toBe(0);
    expect(vm.findDisplayLunchPause(segments)).toBeTruthy();
    expect(vm.formatMinutes(-5)).toBe("-00:05");
    expect(vm.formatDuration(75)).toBe("01:15");
    vm.syncSegments();
    vm.startEdit();
    vm.closeModal();
    const punches = vm.buildPunches("2026-01-15", segments);
    expect(punches).toHaveLength(6);
    await vm.save();
  });

  it("renders App", () => {
    createStore();
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: true,
          TimesheetTable: true
        }
      }
    });
    expect(wrapper.find("div").exists()).toBe(true);
  });
});


