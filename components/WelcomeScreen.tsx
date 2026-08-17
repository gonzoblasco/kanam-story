'use client';

/**
 * Pantalla de bienvenida (onboarding) que se muestra en el área principal
 * cuando no hay ningún proyecto creado. Explica qué es Kanam Story y sus
 * conceptos clave, y guía al primer proyecto.
 *
 * a11y: h1 descriptivo, secciones con h2, botón accesible con aria-label.
 */
export default function WelcomeScreen({
  onCreateProject,
}: {
  onCreateProject: () => void;
}) {
  return (
    <div className="main-content">
      <h1 className="view-title">Bienvenido a Kanam Story</h1>
      <p className="text-muted" style={{ maxWidth: '60ch' }}>
        Un co-writer de ficción local-first donde la conversación es el producto.
        Escribís, estructurás y debatís tu historia con un agente que conoce toda
        la obra y tiene manos para aplicarla.
      </p>

      <div className="row g-3 mt-1">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h6">
                <i className="bi bi-chat-dots me-2 text-primary" aria-hidden="true" />
                El Co-writer
              </h2>
              <p className="small text-muted mb-0">
                Conversá con un agente que conoce tu manuscrito, tu biblia y tu
                brújula. No solo habla: cuando acordás algo, lo aplica a la
                historia. Co-autor, no asistente pasivo.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h6">
                <i className="bi bi-list-nested me-2 text-primary" aria-hidden="true" />
                Outline &amp; Beats
              </h2>
              <p className="small text-muted mb-0">
                Definí la estructura de cada capítulo y escena como un mapa de
                beats, a mano o sugerido por IA. Los beats se conectan con la
                escritura y el chat.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h6">
                <i className="bi bi-book me-2 text-primary" aria-hidden="true" />
                La Biblia Viva
              </h2>
              <p className="small text-muted mb-0">
                Personajes, mundo y reglas que se actualizan solos desde lo
                escrito y desde los cambios del chat. Consistencia automática.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h6">
                <i className="bi bi-compass me-2 text-primary" aria-hidden="true" />
                La Brújula Narrativa
              </h2>
              <p className="small text-muted mb-0">
                Premisa, promesa al lector, arco del protagonista y tema. Visible
                al escribir y al discutir, para no desviarte de lo que prometiste
                contar.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onCreateProject}
          aria-label="Crear tu primer proyecto"
        >
          <i className="bi bi-plus-lg me-2" aria-hidden="true" />
          Crear tu primer proyecto
        </button>
      </div>
    </div>
  );
}
