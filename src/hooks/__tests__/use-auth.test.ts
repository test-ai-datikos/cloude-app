import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);
});

describe("useAuth — initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("useAuth — signIn", () => {
  test("calls signInAction with email and password", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockSignIn).toHaveBeenCalledOnce();
    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password123");
  });

  test("returns the result from signInAction", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("sets isLoading to true while running, then back to false", async () => {
    let resolveSignIn!: (v: any) => void;
    mockSignIn.mockReturnValue(new Promise((r) => { resolveSignIn = r; }));
    mockGetProjects.mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());

    let signInPromise: Promise<any>;
    act(() => {
      signInPromise = result.current.signIn("user@example.com", "pass");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      await signInPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when signInAction throws", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not call handlePostSignIn on failed sign-in", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "wrong");
    });

    expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("useAuth — signUp", () => {
  test("calls signUpAction with email and password", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockSignUp).toHaveBeenCalledOnce();
    expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
  });

  test("returns the result from signUpAction", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("sets isLoading to true while running, then back to false", async () => {
    let resolveSignUp!: (v: any) => void;
    mockSignUp.mockReturnValue(new Promise((r) => { resolveSignUp = r; }));
    mockGetProjects.mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());

    let signUpPromise: Promise<any>;
    act(() => {
      signUpPromise = result.current.signUp("new@example.com", "pass");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: true });
      await signUpPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when signUpAction throws", async () => {
    mockSignUp.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not call handlePostSignIn on failed sign-up", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("existing@example.com", "pass");
    });

    expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("useAuth — handlePostSignIn: anon work with messages", () => {
  const anonWork = {
    messages: [{ role: "user", content: "Hello" }],
    fileSystemData: { "/App.jsx": { type: "file", content: "<App />" } },
  };

  beforeEach(() => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ id: "migrated-project" } as any);
  });

  test("creates a project with the anon work data", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
  });

  test("clears anon work after migrating", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockClearAnonWork).toHaveBeenCalledOnce();
  });

  test("navigates to the migrated project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/migrated-project");
  });

  test("does not call getProjects when anon work exists", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockGetProjects).not.toHaveBeenCalled();
  });
});

describe("useAuth — handlePostSignIn: anon work with empty messages", () => {
  beforeEach(() => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
  });

  test("falls through to getProjects when anon messages array is empty", async () => {
    mockGetProjects.mockResolvedValue([{ id: "existing-project" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockGetProjects).toHaveBeenCalledOnce();
    expect(mockCreateProject).not.toHaveBeenCalled();
  });
});

describe("useAuth — handlePostSignIn: no anon work, has existing projects", () => {
  beforeEach(() => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([
      { id: "project-1" },
      { id: "project-2" },
    ] as any);
  });

  test("navigates to the most recent (first) project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/project-1");
  });

  test("does not create a new project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
  });
});

describe("useAuth — handlePostSignIn: no anon work, no existing projects", () => {
  beforeEach(() => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new-project" } as any);
  });

  test("creates a new empty project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+$/),
      messages: [],
      data: {},
    });
  });

  test("navigates to the newly created project", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
  });
});
