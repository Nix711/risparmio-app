import type { Session } from "next-auth";
import type { Mock } from "vitest";
import { auth } from "@/lib/auth";

// auth() di NextAuth ha più firme (sessione, middleware): i route handler usano solo
// quella che restituisce la sessione. Nei test è il vi.fn() di tests/setup/integration.ts.
const mockedAuth = auth as unknown as Mock<() => Promise<Session | null>>;

export function signInAs(user: { id: string; email: string; name: string | null }) {
  mockedAuth.mockResolvedValue({
    user: { id: user.id, email: user.email, name: user.name },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
}

export function signOut() {
  mockedAuth.mockResolvedValue(null);
}
