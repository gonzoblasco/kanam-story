import type { ContentAction } from '@/types';
import { beatKindLabel } from '@/lib/outlineLabels';

interface OutlineProposalProps {
  action: Extract<ContentAction, { type: 'replace_outline' }>;
}

export default function OutlineProposal({ action }: OutlineProposalProps) {
  const grouped = action.chapters.map((chapter, index) => ({
    chapter,
    beats: action.beats.filter((b) => b.chapterIndex === index),
  }));

  return (
    <div className="outline-proposal">
      <div className="small fw-medium mb-2">
        {action.chapters.length} capítulo{action.chapters.length > 1 ? 's' : ''} · {action.beats.length} beat
        {action.beats.length > 1 ? 's' : ''}
      </div>
      <ol className="list-unstyled mb-0">
        {grouped.map(({ chapter, beats }, i) => (
          <li key={i} className="mb-2">
            <div className="fw-medium">{i + 1}. {chapter.title}</div>
            {beats.length > 0 ? (
              <ol className="list-unstyled ps-3 mb-0">
                {beats.map((b, j) => (
                  <li key={j} className="small text-secondary">
                    <span className="badge text-bg-light me-1">{beatKindLabel(b.kind)}</span>
                    {b.title}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="small text-secondary ps-3">Sin beats</div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
