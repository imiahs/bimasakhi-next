'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';
import { useRouter, usePathname } from 'next/navigation';

const AdminContext = createContext();

export function AdminProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [globalError, setGlobalError] = useState(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const verifySession = async () => {
            if (pathname === '/admin/login') {
                setIsLoading(false);
                return;
            }
            try {
                const res = await adminApi.checkAuth();
                if (res.authenticated) {
                    setIsAuthenticated(true);
                } else {
                    router.push('/admin/login');
                }
            } catch (err) {
                setGlobalError(err.message);
                router.push('/admin/login');
            } finally {
                setIsLoading(false);
            }
        };
        verifySession();
    }, [pathname, router]);

    const value = {
        isAuthenticated,
        isLoading,
        globalError,
        setGlobalError
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
}

export const useAdmin = () => useContext(AdminContext);
