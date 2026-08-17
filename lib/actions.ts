import type { ContentAction, Scene, Beat, Character, WorldEntity, StoryBible, Chapter } from '@/types';

/**
 * Immutable snapshot of the story state that actions are applied to.
 * Only includes what the agent can modify.
 */
export interface StoryState {
  scenes: Scene[];
  beats: Beat[];
  characters: Character[];
  world: WorldEntity[];
  bible: StoryBible | null;
  chapters: Chapter[];
}

export interface ApplyResult {
  next: StoryState;
  /** Function that reverts the action, returning the previous state. */
  undo: (s: StoryState) => StoryState;
}

const now = () => Date.now();

function updateScene(state: StoryState, sceneId: string, patch: Partial<Scene>): StoryState {
  return {
    ...state,
    scenes: state.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch, updatedAt: now() } : s)),
  };
}

function updateBeat(state: StoryState, beatId: string, patch: Partial<Beat>): StoryState {
  return {
    ...state,
    beats: state.beats.map((b) => (b.id === beatId ? { ...b, ...patch, updatedAt: now() } : b)),
  };
}

function updateCharacter(state: StoryState, characterId: string, patch: Partial<Character>): StoryState {
  return {
    ...state,
    characters: state.characters.map((c) =>
      c.id === characterId ? { ...c, ...patch, updatedAt: now() } : c,
    ),
  };
}

function updateWorld(state: StoryState, entityId: string, patch: Partial<WorldEntity>): StoryState {
  return {
    ...state,
    world: state.world.map((w) => (w.id === entityId ? { ...w, ...patch, updatedAt: now() } : w)),
  };
}

function updateBibleSection(
  state: StoryState,
  sectionKey: StoryBible['sections'][number]['key'],
  value: string,
): StoryState {
  if (!state.bible) return state;
  return {
    ...state,
    bible: {
      ...state.bible,
      sections: state.bible.sections.map((s) =>
        s.key === sectionKey ? { ...s, manual: value, updatedAt: now() } : s,
      ),
      updatedAt: now(),
    },
  };
}

/**
 * Applies a ContentAction to the state and returns the new state + a revert
 * function. It is pure: it does not mutate the input state.
 */
export function applyAction(state: StoryState, action: ContentAction): ApplyResult {
  switch (action.type) {
    case 'rewrite_scene': {
      const scene = state.scenes.find((s) => s.id === action.sceneId);
      if (!scene) return { next: state, undo: (s) => s };
      const next = updateScene(state, action.sceneId, { content: action.after });
      return {
        next,
        undo: (s) => updateScene(s, action.sceneId, { content: action.before }),
      };
    }

    case 'update_beat': {
      const beat = state.beats.find((b) => b.id === action.beatId);
      if (!beat) return { next: state, undo: (s) => s };
      const next = updateBeat(state, action.beatId, action.changes);
      return {
        next,
        undo: (s) => updateBeat(s, action.beatId, { ...beat }),
      };
    }

    case 'add_beat': {
      const next = { ...state, beats: [...state.beats, action.beat] };
      return {
        next,
        undo: (s) => ({ ...s, beats: s.beats.filter((b) => b.id !== action.beat.id) }),
      };
    }

    case 'update_character': {
      const character = state.characters.find((c) => c.id === action.characterId);
      if (!character) return { next: state, undo: (s) => s };
      const next = updateCharacter(state, action.characterId, action.changes);
      return {
        next,
        undo: (s) => updateCharacter(s, action.characterId, { ...character }),
      };
    }

    case 'add_character': {
      const next = { ...state, characters: [...state.characters, action.character] };
      return {
        next,
        undo: (s) => ({ ...s, characters: s.characters.filter((c) => c.id !== action.character.id) }),
      };
    }

    case 'update_world': {
      const entity = state.world.find((w) => w.id === action.entityId);
      if (!entity) return { next: state, undo: (s) => s };
      const next = updateWorld(state, action.entityId, action.changes);
      return {
        next,
        undo: (s) => updateWorld(s, action.entityId, { ...entity }),
      };
    }

    case 'update_bible': {
      const before = state.bible?.sections.find((s) => s.key === action.section)?.manual ?? '';
      const next = updateBibleSection(state, action.section, action.value);
      return {
        next,
        undo: (s) => updateBibleSection(s, action.section, before),
      };
    }

    case 'append_scene': {
      // Derive projectId from any entity already present, so a scene isn't
      // created orphaned (projectId "") when the state has no scenes yet.
      const projectId =
        state.scenes[0]?.projectId ??
        state.beats[0]?.projectId ??
        state.characters[0]?.projectId ??
        state.world[0]?.projectId ??
        '';
      const scene: Scene = {
        id: crypto.randomUUID(),
        projectId,
        chapterId: action.chapterId,
        title: 'Escena nueva',
        content: action.content,
        summary: action.summary,
        order: state.scenes.filter((s) => s.chapterId === action.chapterId).length,
        createdAt: now(),
        updatedAt: now(),
      };
      const next = { ...state, scenes: [...state.scenes, scene] };
      return {
        next,
        undo: (s) => ({ ...s, scenes: s.scenes.filter((x) => x.id !== scene.id) }),
      };
    }

    case 'replace_outline': {
      const oldChapters = [...state.chapters];
      const oldBeats = [...state.beats];
      const projectId =
        state.chapters[0]?.projectId ??
        state.beats[0]?.projectId ??
        state.scenes[0]?.projectId ??
        '';
      const nextChapters: Chapter[] = action.chapters.map((c, index) => ({
        id: crypto.randomUUID(),
        projectId,
        title: c.title,
        order: c.order ?? index,
        createdAt: now(),
        updatedAt: now(),
      }));
      const nextBeats: Beat[] = action.beats.map((b) => {
        const chapterId = nextChapters[b.chapterIndex]?.id;
        return {
          id: crypto.randomUUID(),
          projectId,
          chapterId,
          kind: b.kind,
          title: b.title,
          description: b.description,
          notes: b.notes,
          characters: [],
          position: b.position,
          status: b.status ?? 'draft',
          source: 'ai',
          createdAt: now(),
          updatedAt: now(),
        };
      });
      const next = { ...state, chapters: nextChapters, beats: nextBeats };
      return {
        next,
        undo: (s) => ({ ...s, chapters: oldChapters, beats: oldBeats }),
      };
    }

    case 'update_outline': {
      const oldChapters = [...state.chapters];
      const oldBeats = [...state.beats];
      const projectId =
        state.chapters[0]?.projectId ??
        state.beats[0]?.projectId ??
        state.scenes[0]?.projectId ??
        '';
      let next: StoryState = state;

      // Renombrar capítulo
      if (action.renameChapter) {
        next = {
          ...next,
          chapters: next.chapters.map((c) =>
            c.id === action.renameChapter!.chapterId
              ? { ...c, title: action.renameChapter!.title, updatedAt: now() }
              : c,
          ),
        };
      }

      // Borrar capítulo (sus escenas quedan huérfanas, sus beats se borran)
      if (action.deleteChapter) {
        next = {
          ...next,
          chapters: next.chapters.filter((c) => c.id !== action.deleteChapter!.chapterId),
          beats: next.beats.filter((b) => b.chapterId !== action.deleteChapter!.chapterId),
          scenes: next.scenes.map((s) =>
            s.chapterId === action.deleteChapter!.chapterId ? { ...s, chapterId: '' } : s,
          ),
        };
      }

      // Agregar beats
      if (action.addBeats && action.addBeats.length > 0) {
        const added: Beat[] = action.addBeats.map((ab, i) => {
          // Si el beat va a una escena, derivar su capítulo de la escena.
          let chapterId = ab.chapterId;
          if (!chapterId && ab.sceneId) {
            chapterId = next.scenes.find((s) => s.id === ab.sceneId)?.chapterId;
          }
          const position =
            ab.beat.position ??
            next.beats.filter((b) =>
              ab.sceneId
                ? b.sceneId === ab.sceneId
                : b.chapterId === chapterId && !b.sceneId,
            ).length +
              i;
          return {
            id: crypto.randomUUID(),
            projectId,
            chapterId,
            sceneId: ab.sceneId,
            kind: ab.beat.kind,
            title: ab.beat.title,
            description: ab.beat.description,
            notes: ab.beat.notes,
            characters: ab.beat.characters ?? [],
            position,
            status: ab.beat.status ?? 'draft',
            source: 'ai',
            createdAt: now(),
            updatedAt: now(),
          };
        });
        next = { ...next, beats: [...next.beats, ...added] };
      }

      // Borrar beat
      if (action.deleteBeat) {
        next = { ...next, beats: next.beats.filter((b) => b.id !== action.deleteBeat!.beatId) };
      }

      // Mover beat a otro capítulo
      if (action.moveBeatToChapter) {
        const { beatId, targetChapterId } = action.moveBeatToChapter;
        next = {
          ...next,
          beats: next.beats.map((b) =>
            b.id === beatId ? { ...b, chapterId: targetChapterId, sceneId: undefined, updatedAt: now() } : b,
          ),
        };
      }

      // Actualizar beat
      if (action.updateBeat) {
        const { beatId, changes } = action.updateBeat;
        next = {
          ...next,
          beats: next.beats.map((b) =>
            b.id === beatId ? { ...b, ...changes, updatedAt: now() } : b,
          ),
        };
      }

      return {
        next,
        undo: (s) => ({ ...s, chapters: oldChapters, beats: oldBeats, scenes: state.scenes }),
      };
    }

    default:
      return { next: state, undo: (s) => s };
  }
}

/**
 * Applies a list of actions in order, accumulating the reversions.
 * Returns the final state and a function that reverts all in reverse order.
 */
export function applyActions(state: StoryState, actions: ContentAction[]): ApplyResult {
  let current = state;
  const undos: Array<(s: StoryState) => StoryState> = [];
  for (const action of actions) {
    const { next, undo } = applyAction(current, action);
    current = next;
    undos.push(undo);
  }
  return {
    next: current,
    undo: (s) => {
      let result = s;
      for (let i = undos.length - 1; i >= 0; i--) {
        result = undos[i](result);
      }
      return result;
    },
  };
}
