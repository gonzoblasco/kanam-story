import type { BeatKind } from '@/types';

/**
 * U5 — Plantillas de género para el onboarding al crear un proyecto.
 *
 * Datos puros (sin DB/DOM): estructura sugerida (capítulos + beats) para cada
 * género. El modal las aplica tras crear el proyecto, o crea el proyecto vacío
 * si el usuario no elige una plantilla (nunca se obliga a nada).
 *
 * `includeBible` indica si el punto de partida debe además crear una biblia de
 * la historia en blanco (secciones listas para llenar).
 */

export interface TemplateBeat {
  title: string;
  description: string;
  notes: string;
  kind: BeatKind;
}

export interface TemplateChapter {
  title: string;
  beats: TemplateBeat[];
}

export interface ProjectTemplate {
  key: string;
  label: string;
  description: string;
  /** Crear también una biblia en blanco (secciones listas). */
  includeBible?: boolean;
  chapters: TemplateChapter[];
}

/** Géneros disponibles para la plantilla (con estructura sugerida). */
export const GENRE_TEMPLATES: ProjectTemplate[] = [
  {
    key: 'thriller',
    label: 'Thriller',
    description: 'Misterio y tensión, con un crimen, investigación y desenlace.',
    chapters: [
      {
        title: 'El crimen',
        beats: [
          {
            title: 'Un hallazgo inquietante',
            description: 'El protagonista descubre algo que no debería haber visto.',
            notes: 'Tono: tensión creciente, detalles sensoriales del hallazgo.',
            kind: 'inciting',
          },
        ],
      },
      {
        title: 'La investigación',
        beats: [
          {
            title: 'La primera pista',
            description: 'Una pista falsa abre nuevas preguntas.',
            notes: 'Subir la tensión, introducir sospechosos.',
            kind: 'rising',
          },
          {
            title: 'Un sospechoso',
            description: 'Aparece un candidato que no encaja del todo.',
            notes: 'Sembrar duda sobre quién es de fiar.',
            kind: 'rising',
          },
        ],
      },
      {
        title: 'La presión',
        beats: [
          {
            title: 'El asedio',
            description: 'El peligro se acerca y las salidas se cierran.',
            notes: 'Ritmo rápido, capítulos cortos, urgencia.',
            kind: 'climax',
          },
        ],
      },
      {
        title: 'El enfrentamiento',
        beats: [
          {
            title: 'La confrontación',
            description: 'El protagonista encara al responsable cara a cara.',
            notes: 'Clímax: riesgo real, consecuencias irreversibles.',
            kind: 'climax',
          },
        ],
      },
      {
        title: 'El desenlace',
        beats: [
          {
            title: 'Las consecuencias',
            description: 'Todo lo que se desató empieza a asentarse.',
            notes: 'Bajar la tensión, cerrar cabos.',
            kind: 'falling',
          },
          {
            title: 'La verdad',
            description: 'La revelación final reencuadra lo vivido.',
            notes: 'Resolución satisfactoria, eco del incitante.',
            kind: 'resolution',
          },
        ],
      },
    ],
  },
  {
    key: 'romance',
    label: 'Romance',
    description: 'Dos personas se encuentran, chocan y se reconcilian.',
    chapters: [
      {
        title: 'El encuentro',
        beats: [
          {
            title: 'Dos extraños se cruzan',
            description: 'El primer contacto deja una impresión inolvidable.',
            notes: 'Química visible, una chispa que el lector percibe.',
            kind: 'inciting',
          },
        ],
      },
      {
        title: 'La tensión',
        beats: [
          {
            title: 'Acercamiento',
            description: 'Empiezan a conocerse y la atracción crece.',
            notes: 'Momentos compartidos, complicidad.',
            kind: 'rising',
          },
          {
            title: 'El malentendido',
            description: 'Un desencuentro amenaza lo que construían.',
            notes: 'Conflicto emocional, dudas sobre la intención del otro.',
            kind: 'rising',
          },
        ],
      },
      {
        title: 'El conflicto',
        beats: [
          {
            title: 'La prueba decisiva',
            description: 'Deben elegir entre el miedo y arriesgarse.',
            notes: 'Clímax emocional, revelación de sentimientos.',
            kind: 'climax',
          },
        ],
      },
      {
        title: 'La resolución',
        beats: [
          {
            title: 'La reconciliación',
            description: 'Aclaran el malentendido y se reencuentran.',
            notes: 'Cierre cálido, promesa de futuro.',
            kind: 'falling',
          },
          {
            title: 'El desenlace',
            description: 'La historia se cierra con un final esperanzador.',
            notes: 'Resolución, eco del encuentro inicial.',
            kind: 'resolution',
          },
        ],
      },
    ],
  },
  {
    key: 'scifi',
    label: 'Ciencia ficción',
    description: 'Descubrimiento, exploración y crisis en un mundo nuevo.',
    chapters: [
      {
        title: 'El descubrimiento',
        beats: [
          {
            title: 'Algo inesperado',
            description: 'Un hallazgo científico o tecnológico lo cambia todo.',
            notes: 'Tono: asombro mezclado con inquietud.',
            kind: 'inciting',
          },
        ],
      },
      {
        title: 'La exploración',
        beats: [
          {
            title: 'Un mundo nuevo',
            description: 'El equipo se adentra en lo desconocido.',
            notes: 'Construir el escenario, reglas del mundo.',
            kind: 'rising',
          },
          {
            title: 'El costo',
            description: 'La exploración exige un sacrificio inesperado.',
            notes: 'Tensión ética, consecuencias del descubrimiento.',
            kind: 'rising',
          },
        ],
      },
      {
        title: 'La crisis',
        beats: [
          {
            title: 'El punto de no retorno',
            description: 'Una amenaza obliga a una decisión irreversible.',
            notes: 'Clímax: riesgo a gran escala, dilema moral.',
            kind: 'climax',
          },
        ],
      },
      {
        title: 'La solución',
        beats: [
          {
            title: 'El sacrificio',
            description: 'Resolver la crisis tiene un precio.',
            notes: 'Bajar la tensión, consecuencias reales.',
            kind: 'falling',
          },
          {
            title: 'El nuevo comienzo',
            description: 'El mundo queda transformado por lo vivido.',
            notes: 'Resolución, mirada al futuro.',
            kind: 'resolution',
          },
        ],
      },
    ],
  },
];

/** Obtiene una plantilla por clave. */
export function getGenreTemplate(key: string): ProjectTemplate | undefined {
  return GENRE_TEMPLATES.find((t) => t.key === key);
}
