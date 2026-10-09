const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

/**
 * I test d'integrazione svuotano tutte le tabelle: si fermano se il database non è
 * locale o non è un database di test. In questo progetto lo sviluppo ha già scritto
 * in produzione una volta, e un TRUNCATE su Neon non deve poter succedere.
 */
export function assertTestDatabase(url: string | undefined): asserts url is string {
  const parsed = url ? new URL(url) : undefined;
  const database = parsed?.pathname.slice(1);

  if (!parsed || !LOCAL_HOSTS.includes(parsed.hostname) || !database?.endsWith("_test")) {
    // Host e nome del database, mai la URL intera: conterrebbe la password
    throw new Error(
      `I test d'integrazione girano solo su un database locale che finisce in _test, non su ${parsed?.host}/${database}`
    );
  }
}
