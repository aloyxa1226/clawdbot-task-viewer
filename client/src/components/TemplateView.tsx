import type { TemplateType, TemplateData } from '../types/v2';

interface TemplateViewProps {
  templateType: TemplateType;
  templateData: TemplateData;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm mt-0.5 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function ArrayField({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5">
        <ul className="list-disc list-inside text-sm space-y-0.5">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </dd>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {children}
    </span>
  );
}

const severityColors: Record<string, string> = {
  low: 'bg-blue-900/30 text-blue-400 border border-blue-700',
  medium: 'bg-yellow-900/30 text-yellow-400 border border-yellow-700',
  high: 'bg-orange-900/30 text-orange-400 border border-orange-700',
  critical: 'bg-red-900/30 text-red-400 border border-red-700',
};

export function TemplateView({ templateType, templateData }: TemplateViewProps) {
  const data = templateData as Record<string, unknown>;

  return (
    <div className="border-t pt-4">
      <h3 className="font-medium text-sm text-muted-foreground mb-3 capitalize">
        {templateType} Template
      </h3>
      <dl className="space-y-3">
        {templateType === 'feature' && (
          <>
            <Field label="Problem" value={data.problem as string} />
            <Field label="Success Criteria" value={data.success_criteria as string} />
            <Field label="Constraints" value={data.constraints as string} />
            <ArrayField label="References" items={data.references as string[]} />
          </>
        )}

        {templateType === 'bug' && (
          <>
            <Field label="What's Broken" value={data.what_broken as string} />
            <Field label="Reproduction Steps" value={data.repro_steps as string} />
            <Field label="Expected Behavior" value={data.expected as string} />
            <Field label="Severity" value={
              data.severity ? <Badge color={severityColors[data.severity as string] || ''}>{(data.severity as string).toUpperCase()}</Badge> : null
            } />
          </>
        )}

        {templateType === 'architecture' && (
          <>
            <Field label="Context" value={data.context as string} />
            <ArrayField label="Options" items={data.options as string[]} />
            <Field label="Tradeoffs" value={data.tradeoffs as string} />
            <Field label="Recommendation Needed" value={data.recommendation_needed ? 'Yes' : 'No'} />
          </>
        )}

        {templateType === 'research' && (
          <>
            <Field label="Question" value={data.question as string} />
            <Field label="Scope" value={data.scope as string} />
            <Field label="Depth" value={
              <Badge color="bg-muted text-foreground">{(data.depth as string)?.toUpperCase()}</Badge>
            } />
            <Field label="Output Format" value={data.output_format as string} />
          </>
        )}

        {templateType === 'code' && (
          <>
            <Field label="Repository" value={data.repo as string} />
            <Field label="Branch" value={data.branch as string} />
            <Field label="Description" value={data.description as string} />
            <Field label="Acceptance Criteria" value={data.acceptance_criteria as string} />
            <ArrayField label="Files" items={data.files as string[]} />
          </>
        )}
      </dl>
    </div>
  );
}
