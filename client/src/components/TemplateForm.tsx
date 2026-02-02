import { useState } from 'react';
import type { TemplateType } from '../types/v2';

interface TemplateFormProps {
  templateType: TemplateType | null;
  value: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  disabled?: boolean;
}

function StringField({ label, field, required, value, onChange, disabled, rows }: {
  label: string; field: string; required?: boolean; value: string;
  onChange: (field: string, val: string) => void; disabled?: boolean; rows?: number;
}) {
  const Tag = rows ? 'textarea' : 'input';
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Tag
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        disabled={disabled}
        rows={rows}
        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      />
    </div>
  );
}

function StringArrayField({ label, field, required, value, onChange, disabled }: {
  label: string; field: string; required?: boolean; value: string[];
  onChange: (field: string, val: string[]) => void; disabled?: boolean;
}) {
  const [input, setInput] = useState('');
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault();
              onChange(field, [...value, input.trim()]);
              setInput('');
            }
          }}
          disabled={disabled}
          placeholder="Type and press Enter"
          className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 text-sm"
        />
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
              {item}
              <button
                type="button"
                onClick={() => onChange(field, value.filter((_, j) => j !== i))}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground"
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectField({ label, field, required, value, options, onChange, disabled }: {
  label: string; field: string; required?: boolean; value: string;
  options: { value: string; label: string }[];
  onChange: (field: string, val: string) => void; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      >
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function BooleanField({ label, field, required, value, onChange, disabled }: {
  label: string; field: string; required?: boolean; value: boolean;
  onChange: (field: string, val: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(field, e.target.checked)}
        disabled={disabled}
        className="rounded border-input"
      />
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
}

export function TemplateForm({ templateType, value, onChange, disabled }: TemplateFormProps) {
  const set = (field: string, val: unknown) => {
    onChange({ ...value, [field]: val });
  };

  const str = (field: string) => (value[field] as string) || '';
  const arr = (field: string) => (value[field] as string[]) || [];
  const bool = (field: string) => (value[field] as boolean) || false;

  if (!templateType) return null;

  return (
    <div className="space-y-3 border-t pt-3">
      <h4 className="text-sm font-medium text-muted-foreground capitalize">{templateType} Template Fields</h4>

      {templateType === 'feature' && (
        <>
          <StringField label="Problem" field="problem" required value={str('problem')} onChange={set} disabled={disabled} rows={3} />
          <StringField label="Success Criteria" field="success_criteria" required value={str('success_criteria')} onChange={set} disabled={disabled} rows={3} />
          <StringField label="Constraints" field="constraints" value={str('constraints')} onChange={set} disabled={disabled} rows={2} />
          <StringArrayField label="References" field="references" value={arr('references')} onChange={set} disabled={disabled} />
        </>
      )}

      {templateType === 'bug' && (
        <>
          <StringField label="What's Broken" field="what_broken" required value={str('what_broken')} onChange={set} disabled={disabled} rows={3} />
          <StringField label="Reproduction Steps" field="repro_steps" required value={str('repro_steps')} onChange={set} disabled={disabled} rows={3} />
          <StringField label="Expected Behavior" field="expected" required value={str('expected')} onChange={set} disabled={disabled} rows={2} />
          <SelectField label="Severity" field="severity" required value={str('severity')} onChange={set} disabled={disabled}
            options={[
              { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
            ]} />
        </>
      )}

      {templateType === 'architecture' && (
        <>
          <StringField label="Context" field="context" required value={str('context')} onChange={set} disabled={disabled} rows={3} />
          <StringArrayField label="Options" field="options" required value={arr('options')} onChange={set} disabled={disabled} />
          <StringField label="Tradeoffs" field="tradeoffs" value={str('tradeoffs')} onChange={set} disabled={disabled} rows={2} />
          <BooleanField label="Recommendation Needed" field="recommendation_needed" required value={bool('recommendation_needed')} onChange={set} disabled={disabled} />
        </>
      )}

      {templateType === 'research' && (
        <>
          <StringField label="Question" field="question" required value={str('question')} onChange={set} disabled={disabled} rows={3} />
          <StringField label="Scope" field="scope" required value={str('scope')} onChange={set} disabled={disabled} rows={2} />
          <SelectField label="Depth" field="depth" required value={str('depth')} onChange={set} disabled={disabled}
            options={[{ value: 'quick', label: 'Quick' }, { value: 'deep', label: 'Deep' }]} />
          <StringField label="Output Format" field="output_format" required value={str('output_format')} onChange={set} disabled={disabled} />
        </>
      )}

      {templateType === 'code' && (
        <>
          <StringField label="Repository" field="repo" required value={str('repo')} onChange={set} disabled={disabled} />
          <StringField label="Branch" field="branch" value={str('branch')} onChange={set} disabled={disabled} />
          <StringField label="Description" field="description" required value={str('description')} onChange={set} disabled={disabled} rows={3} />
          <StringField label="Acceptance Criteria" field="acceptance_criteria" required value={str('acceptance_criteria')} onChange={set} disabled={disabled} rows={3} />
          <StringArrayField label="Files" field="files" value={arr('files')} onChange={set} disabled={disabled} />
        </>
      )}
    </div>
  );
}
