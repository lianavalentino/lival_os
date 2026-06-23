export function LoadingScreen({
  title,
  embedded = false,
}: {
  title: string;
  embedded?: boolean;
}) {
  return (
    <main className={embedded ? "loading-panel" : "auth-screen"}>
      <section className="panel loading-card">
        <div className="loading-dot" />
        <h1>{title}</h1>
        <p>Connecting the pieces without making a racket.</p>
      </section>
    </main>
  );
}
