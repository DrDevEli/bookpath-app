export type BookPathEnvironment = 'dev' | 'stage' | 'prod';
export declare const resolveEnvironment: (rawEnv?: string | null) => BookPathEnvironment;
