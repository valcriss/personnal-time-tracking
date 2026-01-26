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
  store.days = [{ date: "2026-01-10", dayType: "NORMAL", telework: false, segments: [] }];
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
        todayWarnings: ["incompleteDay"]
      }
    });
    expect(wrapper.text()).toContain("Solde global");
    expect(wrapper.text()).toContain("Journée incomplète");
  });

  it("adds segment in SegmentsEditor", async () => {
    const wrapper = mount(SegmentsEditor, { props: { modelValue: [] } });
    await wrapper.find("button").trigger("click");
    const emits = wrapper.emitted("update:modelValue");
    expect(emits?.[0][0]).toEqual([{ start: "08:00", end: "08:00" }]);
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

  it("renders TimesheetTable", () => {
    const wrapper = mount(TimesheetTable, {
      props: {
        days: [{ date: "2026-01-10", dayType: "NORMAL", telework: false, segments: [] }]
      }
    });
    expect(wrapper.text()).toContain("2026-01-10");
  });

  it("edits DayRow for non-today", async () => {
    const store = createStore();
    store.days = [
      { date: "2026-01-09", dayType: "NORMAL", telework: false, segments: [] },
      { date: "2026-01-10", dayType: "NORMAL", telework: false, segments: [] }
    ];

    const wrapper = mount(DayRow, {
      props: { day: store.days[0] }
    });

    await wrapper.find("button").trigger("click");
    await wrapper.find("button").trigger("click");
    expect(store.updateDay).toHaveBeenCalled();
  });

  it("renders DayRow for non-normal day", () => {
    createStore();
    const wrapper = mount(DayRow, {
      props: { day: { date: "2026-01-08", dayType: "SICK", telework: false, segments: [] } }
    });
    expect(wrapper.text()).toContain("—");
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
