export default function OfflinePage() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100vh",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          Sin conexión
        </h1>
        <p style={{ color: "var(--sl-text-muted, #888)" }}>
          Kanam Story funciona offline. Tus proyectos y escenas están guardados
          localmente. Volvé a conectar cuando quieras usar el co-writer.
        </p>
      </div>
    </div>
  );
}