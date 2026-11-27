// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiRequest,
  apiDownload,
  getAccessToken,
  saveAccessToken,
  SESSION_EXPIRED_EVENT,
} from "./api";

const unauthorized = () => ({
  ok: false,
  status: 401,
  json: async () => ({ message: "Sessão inválida" }),
});
describe("Expiração de sessão na integração HTTP", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it("remove token e avisa o aplicativo quando a sessão atual é recusada", async () => {
    saveAccessToken("sessao-ficticia", true);
    const dispatch = vi.spyOn(window, "dispatchEvent");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(apiRequest("/driver/trips")).rejects.toMatchObject({
      status: 401,
    });
    expect(getAccessToken()).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: SESSION_EXPIRED_EVENT }),
    );
  });
  it("não apaga uma sessão nova quando chega um erro de uma requisição antiga", async () => {
    saveAccessToken("sessao-antiga-ficticia", false);
    let finish!: (value: ReturnType<typeof unauthorized>) => void;
    const pending = new Promise<ReturnType<typeof unauthorized>>((resolve) => {
      finish = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending));
    const dispatch = vi.spyOn(window, "dispatchEvent");
    const request = apiRequest("/driver/trips");
    saveAccessToken("sessao-nova-ficticia", false);
    finish(unauthorized());
    await expect(request).rejects.toMatchObject({ status: 401 });
    expect(getAccessToken()).toBe("sessao-nova-ficticia");
    expect(dispatch).not.toHaveBeenCalled();
  });
  it("aplica a mesma invalidação a downloads autenticados", async () => {
    saveAccessToken("sessao-ficticia", false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(apiDownload("/reports/trips.xlsx")).rejects.toMatchObject({
      status: 401,
    });
    expect(getAccessToken()).toBeNull();
  });
});
