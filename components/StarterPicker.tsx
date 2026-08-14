'use client';

import { useId } from 'react';
import { GENRE_TEMPLATES } from '@/lib/projectTemplates';

/**
 * U5 — Selector de punto de partida al crear un proyecto.
 *
 * Radio group accesible (WAI-ARIA radiogroup): cada opción es un `role="radio"`
 * con `aria-checked`, navegable por flechas (roving tabindex), Tab para salir y
 * Enter/Espacio para seleccionar. Foco visible vía el anillo global
 * `:focus-visible`. Si se elige una plantilla de género, además se muestra un
 * segundo radio group para elegir el género (con instrucciones descriptivas).
 */

export type StarterKey = 'outline' | 'bible' | 'template' | 'empty';

export const STARTER_OPTIONS: Array<{
  key: StarterKey;
  label: string;
  description: string;
}> = [
  {
    key: 'outline',
    label: 'Outline en blanco',
    description: 'Empezar con un capítulo y un beat listos para armar tu estructura.',
  },
  {
    key: 'bible',
    label: 'Biblia de la historia',
    description: 'Empezar definiendo mundo, personajes y reglas en una biblia en blanco.',
  },
  {
    key: 'template',
    label: 'Plantilla de género',
    description: 'Usar una estructura sugerida de capítulos y beats según el género.',
  },
  {
    key: 'empty',
    label: 'Proyecto vacío',
    description: 'Empezar en blanco y construir la historia como prefieras.',
  },
];

interface RadioItemProps {
  id: string;
  checked: boolean;
  label: string;
  description: string;
  onSelect: () => void;
}

function RadioItem({ id, checked, label, description, onSelect }: RadioItemProps) {
  return (
    <div
      id={id}
      role="radio"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      tabIndex={checked ? 0 : -1}
      className={`starter-option${checked ? ' starter-option-checked' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="starter-radio" aria-hidden="true" />
      <span className="starter-option-text">
        <span id={`${id}-label`} className="starter-option-label">
          {label}
        </span>
        <span className="starter-option-desc">{description}</span>
      </span>
    </div>
  );
}

export default function StarterPicker({
  value,
  onChange,
  genre,
  onGenreChange,
}: {
  value: StarterKey;
  onChange: (k: StarterKey) => void;
  genre: string;
  onGenreChange: (g: string) => void;
}) {
  const uid = useId();
  const groupLabelId = `${uid}-label`;
  const genreLabelId = `${uid}-genre-label`;
  const index = STARTER_OPTIONS.findIndex((o) => o.key === value);
  const currentIndex = index === -1 ? 0 : index;

  const moveTo = (i: number) => {
    const clamped = (i + STARTER_OPTIONS.length) % STARTER_OPTIONS.length;
    onChange(STARTER_OPTIONS[clamped].key);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveTo(currentIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      moveTo(currentIndex - 1);
    }
  };

  const genreIndex = GENRE_TEMPLATES.findIndex((t) => t.key === genre);
  const genreCurrent = genreIndex === -1 ? 0 : genreIndex;
  const genreMoveTo = (i: number) => {
    const clamped = (i + GENRE_TEMPLATES.length) % GENRE_TEMPLATES.length;
    onGenreChange(GENRE_TEMPLATES[clamped].key);
  };

  return (
    <div className="mb-3">
      <div className="form-label" id={groupLabelId}>
        Punto de partida
      </div>
      <div
        role="radiogroup"
        aria-labelledby={groupLabelId}
        onKeyDown={handleKeyDown}
        className="starter-group"
      >
        {STARTER_OPTIONS.map((o) => (
          <RadioItem
            key={o.key}
            id={`${uid}-${o.key}`}
            checked={value === o.key}
            label={o.label}
            description={o.description}
            onSelect={() => onChange(o.key)}
          />
        ))}
      </div>

      {value === 'template' ? (
        <div className="mt-3">
          <div className="form-label" id={genreLabelId}>
            Género de la plantilla
          </div>
          <div
            role="radiogroup"
            aria-labelledby={genreLabelId}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                genreMoveTo(genreCurrent + 1);
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                genreMoveTo(genreCurrent - 1);
              }
            }}
            className="starter-group"
          >
            {GENRE_TEMPLATES.map((t) => (
              <RadioItem
                key={t.key}
                id={`${uid}-genre-${t.key}`}
                checked={genre === t.key}
                label={t.label}
                description={t.description}
                onSelect={() => onGenreChange(t.key)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
