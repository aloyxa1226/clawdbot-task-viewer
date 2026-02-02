import type { TemplateType } from '../types/v2.js';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function requireString(data: Record<string, unknown>, field: string, errors: ValidationError[]): void {
  const val = data[field];
  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
    errors.push({ field, message: `${field} is required` });
  } else if (typeof val !== 'string') {
    errors.push({ field, message: `${field} must be a string` });
  }
}

function requireStringArray(data: Record<string, unknown>, field: string, errors: ValidationError[]): void {
  const val = data[field];
  if (val === undefined || val === null) {
    errors.push({ field, message: `${field} is required` });
  } else if (!Array.isArray(val) || !val.every(v => typeof v === 'string')) {
    errors.push({ field, message: `${field} must be an array of strings` });
  } else if (val.length === 0) {
    errors.push({ field, message: `${field} must not be empty` });
  }
}

function requireBoolean(data: Record<string, unknown>, field: string, errors: ValidationError[]): void {
  const val = data[field];
  if (val === undefined || val === null) {
    errors.push({ field, message: `${field} is required` });
  } else if (typeof val !== 'boolean') {
    errors.push({ field, message: `${field} must be a boolean` });
  }
}

function requireEnum(data: Record<string, unknown>, field: string, allowed: string[], errors: ValidationError[]): void {
  const val = data[field];
  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
    errors.push({ field, message: `${field} is required` });
  } else if (typeof val !== 'string' || !allowed.includes(val)) {
    errors.push({ field, message: `${field} must be one of: ${allowed.join(', ')}` });
  }
}

const validators: Record<TemplateType, (data: Record<string, unknown>) => ValidationError[]> = {
  feature(data) {
    const errors: ValidationError[] = [];
    requireString(data, 'problem', errors);
    requireString(data, 'success_criteria', errors);
    // constraints: optional string
    // references: optional string[]
    return errors;
  },
  bug(data) {
    const errors: ValidationError[] = [];
    requireString(data, 'what_broken', errors);
    requireString(data, 'repro_steps', errors);
    requireString(data, 'expected', errors);
    requireEnum(data, 'severity', ['low', 'medium', 'high', 'critical'], errors);
    return errors;
  },
  architecture(data) {
    const errors: ValidationError[] = [];
    requireString(data, 'context', errors);
    requireStringArray(data, 'options', errors);
    // tradeoffs: optional string
    requireBoolean(data, 'recommendation_needed', errors);
    return errors;
  },
  research(data) {
    const errors: ValidationError[] = [];
    requireString(data, 'question', errors);
    requireString(data, 'scope', errors);
    requireEnum(data, 'depth', ['quick', 'deep'], errors);
    requireString(data, 'output_format', errors);
    return errors;
  },
  code(data) {
    const errors: ValidationError[] = [];
    requireString(data, 'repo', errors);
    // branch: optional
    requireString(data, 'description', errors);
    requireString(data, 'acceptance_criteria', errors);
    // files: optional string[]
    return errors;
  },
};

export function validateTemplateData(
  templateType: TemplateType | null | undefined,
  templateData: unknown,
): ValidationResult {
  // No template type = freeform, skip validation
  if (!templateType) {
    return { valid: true, errors: [] };
  }

  const validator = validators[templateType];
  if (!validator) {
    return { valid: false, errors: [{ field: 'template_type', message: `Unknown template type: ${templateType}` }] };
  }

  if (!templateData || typeof templateData !== 'object' || Array.isArray(templateData)) {
    return { valid: false, errors: [{ field: 'template_data', message: 'template_data must be an object' }] };
  }

  const errors = validator(templateData as Record<string, unknown>);
  return { valid: errors.length === 0, errors };
}
