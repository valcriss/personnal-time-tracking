import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import App from "../src/App.vue";
import { useTimeStore } from "../src/store/timeStore";
import { apiGetBlob, apiPost } from "../src/api";

vi.mock("../src/api", () => ({
  apiGetBlob: vi.fn(),
  apiPost: vi.fn()
}));

const AppHeaderStub = {
  template:
    "<div><button data-test='export' @click=\"$emit('export')\"></button><button data-test='import' @click=\"$emit('import')\"></button><button data-test='archive' @click=\"$emit('archive')\"></button><button data-test='toggle' @click=\"$emit('toggle-archived')\"></button></div>"
};

const TimesheetTableStub = {
  props: ["days", "selectedDates"],
  template:
    "<div><button data-test='select' @click=\"$emit('toggle-select', '2026-01-10', true)\"></button><button data-test='deselect' @click=\"$emit('toggle-select', '2026-01-10', false)\"></button></div>"
};

describe("App", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useTimeStore();
    store.loadDays = vi.fn();
    store.loadSummary = vi.fn();
    store.days = [
      { date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, segments: [], punches: [] }
    ];
    store.allDays = [
      { date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, segments: [], punches: [] },
      { date: "2026-01-09", dayType: "NORMAL", telework: false, archived: true, segments: [], punches: [] }
    ];
    vi.mocked(apiPost).mockClear();
    vi.mocked(apiGetBlob).mockClear();
  });

  it("exports data", async () => {
    const blob = new Blob(["ok"]);
    vi.mocked(apiGetBlob).mockResolvedValue(blob);
    if (!("createObjectURL" in URL)) {
      // @ts-expect-error test shim
      URL.createObjectURL = () => "blob:mock";
    }
    if (!("revokeObjectURL" in URL)) {
      // @ts-expect-error test shim
      URL.revokeObjectURL = () => {};
    }
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await wrapper.find("[data-test='export']").trigger("click");
    expect(apiGetBlob).toHaveBeenCalledWith("/api/export");
    expect(createUrl).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalled();

    clickSpy.mockRestore();
    createUrl.mockRestore();
    revokeUrl.mockRestore();
  });

  it("archives selected dates", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await wrapper.find("[data-test='select']").trigger("click");
    await wrapper.find("[data-test='archive']").trigger("click");
    expect(apiPost).toHaveBeenCalledWith("/api/archive", { dates: ["2026-01-10"] });
  });

  it("removes selection and skips archive", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await wrapper.find("[data-test='select']").trigger("click");
    await wrapper.find("[data-test='deselect']").trigger("click");
    await wrapper.find("[data-test='archive']").trigger("click");
    expect(apiPost).not.toHaveBeenCalledWith("/api/archive", expect.anything());
  });

  it("toggles archived display", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await wrapper.find("[data-test='toggle']").trigger("click");
    const table = wrapper.findComponent(TimesheetTableStub);
    expect((table.props() as { days: unknown[] }).days).toHaveLength(2);
  });

  it("keeps weekend when next week has visible weekday", async () => {
    const store = useTimeStore();
    store.days = [
      { date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, segments: [], punches: [] },
      { date: "2026-01-12", dayType: "NORMAL", telework: false, archived: false, segments: [], punches: [] }
    ];

    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    const table = wrapper.findComponent(TimesheetTableStub);
    expect((table.props() as { days: unknown[] }).days).toHaveLength(2);
  });

  it("filters weekend when next week has no visible weekday", async () => {
    const store = useTimeStore();
    store.days = [
      { date: "2026-01-10", dayType: "NORMAL", telework: false, archived: false, segments: [], punches: [] }
    ];

    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    const table = wrapper.findComponent(TimesheetTableStub);
    expect((table.props() as { days: unknown[] }).days).toHaveLength(0);
  });

  it("uses sunday to monday offset for weekend filter", async () => {
    const store = useTimeStore();
    store.days = [
      { date: "2026-01-11", dayType: "NORMAL", telework: false, archived: false, segments: [], punches: [] },
      { date: "2026-01-12", dayType: "NORMAL", telework: false, archived: false, segments: [], punches: [] }
    ];

    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    const table = wrapper.findComponent(TimesheetTableStub);
    expect((table.props() as { days: unknown[] }).days).toHaveLength(2);
  });

  it("imports data from file", async () => {
    vi.mocked(apiPost).mockResolvedValue(undefined);
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await wrapper.find("[data-test='import']").trigger("click");
    const file = {
      text: async () => JSON.stringify({ days: [] })
    };
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", {
      value: [file]
    });
    await input.trigger("change");
    const importButton = wrapper.findAll("button").find((button) => button.text() === "Importer");
    if (!importButton) {
      throw new Error("Import button not found");
    }
    await importButton.trigger("click");
    expect(apiPost).toHaveBeenCalledWith("/api/import", { days: [] });
  });

  it("does not import when no file is selected", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await wrapper.find("[data-test='import']").trigger("click");
    const importButton = wrapper.findAll("button").find((button) => button.text() === "Importer");
    if (!importButton) {
      throw new Error("Import button not found");
    }
    await importButton.trigger("click");
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("handles empty file input and import guard", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await wrapper.find("[data-test='import']").trigger("click");
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", { value: [] });
    await input.trigger("change");
    await (wrapper.vm as any).importData();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("clears import file when no file provided", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await wrapper.find("[data-test='import']").trigger("click");
    await (wrapper.vm as any).handleFileChange({ target: {} });
    await (wrapper.vm as any).importData();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("keeps import loading reset on invalid JSON", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await wrapper.find("[data-test='import']").trigger("click");
    const file = {
      text: async () => "{bad json"
    };
    const input = wrapper.find("input[type='file']");
    Object.defineProperty(input.element, "files", {
      value: [file]
    });
    await input.trigger("change");
    await expect((wrapper.vm as any).importData()).rejects.toThrow();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("loads days using start of year when needed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T10:00:00.000Z"));
    const wrapper = mount(App, {
      global: {
        stubs: {
          AppHeader: AppHeaderStub,
          TimesheetTable: TimesheetTableStub,
          teleport: true
        }
      }
    });

    await (wrapper.vm as any).load();
    vi.setSystemTime(new Date("2026-06-15T10:00:00.000Z"));
    await (wrapper.vm as any).load();
    vi.useRealTimers();
  });
});
