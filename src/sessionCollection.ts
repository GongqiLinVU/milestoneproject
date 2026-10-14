export type CollectionMode = 'disabled' | 'deterministic' | 'ai';
export const collectionLabels: Record<CollectionMode,string> = { disabled:'Existing classroom workflow', deterministic:'Guided Form', ai:'AI Conversation' };
export function effectiveCollectionMode(block:CollectionMode, override?:CollectionMode|null):CollectionMode {return override??block;}
