// Validation types for BookPath application

// Validation Rules
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom';
  value?: any;
  message: string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule[];
}

// Form Validation
export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  field?: string;
}

// Input Validation
export interface InputValidator {
  validate: (value: any) => ValidationResult;
  sanitize?: (value: any) => any;
}

export interface ValidationConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => ValidationResult;
  sanitize?: (value: any) => any;
}

// API Validation
export interface ApiValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface ApiValidationResponse {
  success: false;
  errors: ApiValidationError[];
  message: string;
}

// Schema Validation
export interface SchemaValidator<T = any> {
  validate: (data: T) => ValidationResult;
  sanitize?: (data: T) => T;
}

export interface SchemaDefinition {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => ValidationResult;
    sanitize?: (value: any) => any;
  };
}

// Export validation types
export * from './schemas'; 