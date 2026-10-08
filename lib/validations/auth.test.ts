import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

describe("loginSchema", () => {
  it("accetta email e password", () => {
    expect(loginSchema.safeParse({ email: "demo@balancebook.local", password: "x" }).success).toBe(true);
  });

  it("rifiuta un'email non valida", () => {
    const result = loginSchema.safeParse({ email: "demo", password: "x" });
    expect(result.error?.issues[0].message).toBe("Email non valida");
  });

  it("richiede la password", () => {
    const result = loginSchema.safeParse({ email: "demo@balancebook.local", password: "" });
    expect(result.error?.issues[0].message).toBe("Password richiesta");
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "Utente Demo",
    email: "demo@balancebook.local",
    password: "demo1234",
    confirmPassword: "demo1234",
  };

  it("accetta una registrazione valida", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("segnala le password diverse sul campo di conferma", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "altro" });
    expect(result.error?.issues[0]).toMatchObject({
      message: "Le password non corrispondono",
      path: ["confirmPassword"],
    });
  });

  it("richiede almeno 6 caratteri di password", () => {
    const result = registerSchema.safeParse({ ...valid, password: "12345", confirmPassword: "12345" });
    expect(result.error?.issues[0].message).toBe("Password deve avere almeno 6 caratteri");
  });

  it("richiede almeno 2 caratteri di nome", () => {
    const result = registerSchema.safeParse({ ...valid, name: "A" });
    expect(result.error?.issues[0].message).toBe("Nome deve avere almeno 2 caratteri");
  });
});
