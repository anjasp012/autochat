export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    is_admin?: boolean;
    role?: 'admin' | 'operator' | string;
    assigned_application_ids?: number[] | null;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
