export interface ApplicationSummary {
    id: number;
    app_id: string;
    name: string;
    is_active: boolean;
    model?: string;
}

export interface ApplicationDetail extends ApplicationSummary {
    description: string | null;
    welcome_message?: string | null;
    chat_settings?: Record<string, any> | null;
    system_prompt: string;
    model: string;
    temperature: number;
    max_tokens: number;
    created_at: string;
    updated_at: string;
    conversations_count?: number;
    knowledge_sources_count?: number;
    knowledge_chunks_count?: number;
}
