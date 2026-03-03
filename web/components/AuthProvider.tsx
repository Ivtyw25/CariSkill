'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

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
    const [currentUser, setCurrentUser] = useState<User | null>(user);

    // Since the user is passed down from the server on initial load,
    // we do not need to show a loading state immediately if we have them!
    const [isLoading, setIsLoading] = useState<boolean>(!user);

    useEffect(() => {
        // If the server didn't provide a user (e.g. static export, or not found)
        // We could potentially refetch here if needed, but since our layout is SSR
        // 'user' will always be accurate as of the last hydration. 
        // This effect is mainly to sync state.
        setCurrentUser(user);
        setIsLoading(false);
    }, [user]);

    return (
        <AuthContext.Provider value={{ user: currentUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}
