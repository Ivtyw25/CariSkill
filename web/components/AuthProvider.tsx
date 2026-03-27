'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({
    user,
    children,
}: {
    user: User | null;
    children: React.ReactNode;
}) {
    // Initialise from the server-injected user — this prevents the first-paint flicker
    const [currentUser, setCurrentUser] = useState<User | null>(user);
    const [isLoading, setIsLoading] = useState<boolean>(!user);

    useEffect(() => {
        // Keep in sync when the server prop changes (e.g. hard navigations)
        setCurrentUser(user);
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        const supabase = createClient();

        // Subscribe to ALL auth state changes so the avatar never goes stale
        // during client-side navigation or background token refreshes.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setCurrentUser(session?.user ?? null);
                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []); // Empty array — only run once on mount, the listener handles the rest

    return (
        <AuthContext.Provider value={{ user: currentUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}
