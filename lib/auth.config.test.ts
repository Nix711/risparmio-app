import { describe, expect, it } from "vitest";
import { authConfig } from "./auth.config";

const { jwt, session, authorized } = authConfig.callbacks!;

// Le firme dei callback di NextAuth hanno molti campi: i test passano solo quelli che il codice legge
type JwtParams = Parameters<NonNullable<typeof jwt>>[0];
type SessionParams = Parameters<NonNullable<typeof session>>[0];
type AuthorizedParams = Parameters<NonNullable<typeof authorized>>[0];

/** Quello che il proxy decide per una richiesta a `pathname`, con o senza login. */
function access(pathname: string, loggedIn: boolean) {
  return authorized!({
    auth: loggedIn ? { user: { id: "u1" }, expires: "" } : null,
    request: { nextUrl: new URL(pathname, "http://localhost:3000") },
  } as unknown as AuthorizedParams);
}

describe("authorized: chi può aprire quale pagina", () => {
  it.each(["/", "/expenses", "/statistics", "/goals", "/profile", "/api/expenses"])(
    "%s richiede il login",
    (pathname) => {
      expect(access(pathname, false)).toBe(false);
      expect(access(pathname, true)).toBe(true);
    }
  );

  it.each(["/login", "/register"])("%s è aperta a chi non ha fatto login", (pathname) => {
    expect(access(pathname, false)).toBe(true);
  });

  it.each(["/login", "/register"])("%s rimanda alla dashboard chi ha già fatto login", (pathname) => {
    const result = access(pathname, true);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("location")).toBe("http://localhost:3000/");
  });

  // Login, logout e sessione passano da qui: bloccarle renderebbe impossibile entrare
  it("lascia sempre passare le route di NextAuth", () => {
    expect(access("/api/auth/session", false)).toBe(true);
    expect(access("/api/auth/callback/credentials", false)).toBe(true);
  });
});

describe("jwt e session: l'id dell'utente arriva nella sessione", () => {
  it("al login copia l'id dell'utente nel token", async () => {
    expect(await jwt!({ token: {}, user: { id: "u1" } } as JwtParams)).toEqual({ id: "u1" });
  });

  // I tipi di NextAuth dichiarano user obbligatorio, ma arriva solo al login
  it("nelle richieste successive lascia il token com'è", async () => {
    expect(await jwt!({ token: { id: "u1" } } as unknown as JwtParams)).toEqual({ id: "u1" });
  });

  it("copia l'id dal token nella sessione", async () => {
    const result = await session!({
      session: { user: { name: "Utente Demo" }, expires: "" },
      token: { id: "u1" },
    } as unknown as SessionParams);

    expect(result).toMatchObject({ user: { id: "u1", name: "Utente Demo" } });
  });

  it("lascia com'è una sessione senza utente", async () => {
    const empty = { expires: "" };

    expect(await session!({ session: empty, token: { id: "u1" } } as unknown as SessionParams)).toEqual(empty);
  });
});
