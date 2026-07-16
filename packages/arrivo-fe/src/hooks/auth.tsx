import { asyncHandle } from "@/lib";
import { useRootStore } from "./store";
import { useMemoizedFn, useLocalStorageState } from 'ahooks'
import axios from "axios";
import { useEffect } from "react";
import { clearPwaUserScope, setPwaUserScope } from "@/lib/pwa";


export const useAuth = () => {
    const store = useRootStore();
    const [userData, setUserData] = useLocalStorageState('userData', { defaultValue: {} });
    useEffect(() => {
        if (userData) {
            store.setUserData(userData);
        }
    }, []);

    const syncUserData = useMemoizedFn((data: any) => {
        store.setUserData(data);
        setUserData(data);
    });

    const login = useMemoizedFn(async (email: string, password: string) => {
        const [error, res] = await asyncHandle(axios.post('/api/auth/emailPasswordSignIn', {
            email,
            password,
        }));
        if (!error) {
            const user = res?.data?.data?.payload;
            syncUserData(user);
            if (user?.id) await setPwaUserScope(String(user.id));
        }
        return [error, res];
    });

    const registerEmailPassword = useMemoizedFn(async (email: string, password: string) => {
        const [error, res] = await asyncHandle(axios.post('/api/auth/registerEmailPassword', {
            email,
            password,
        }));
        if (!error) {
            const user = res?.data?.data?.payload;
            syncUserData(user);
            if (user?.id) await setPwaUserScope(String(user.id));
        }
        return [error, res];
    });

    const resetPassword = useMemoizedFn(async (token: string, password: string) => {
        const [error, res] = await asyncHandle(axios.post('/api/auth/resetPassword', {
            token,
            password,
        }));
        if (!error) {
            const user = res?.data?.data?.payload;
            syncUserData(user);
            if (user?.id) await setPwaUserScope(String(user.id));
        }
        return [error, res];
    });

    const sendPasswordResetEmail = useMemoizedFn((email: string) => {
        return asyncHandle(axios.post('/api/auth/sendPasswordResetEmail', { email }));
    });

    const sendEmailLoginLink = useMemoizedFn((email: string, redirect: string | null = null) => {
        const callback = new URL('/login', window.location.origin);
        callback.searchParams.set('emailLink', '1');
        if (redirect) callback.searchParams.set('redirect', redirect);
        return asyncHandle(axios.post('/api/auth/sendEmailLoginLink', {
            email,
            redirect: callback.toString(),
        }));
    });

    const loadCurrentUser = useMemoizedFn(async () => {
        const [error, res] = await asyncHandle(axios.get('/api/auth'));
        const user = res?.data?.data;
        if (!error && user?.id) {
            syncUserData(user);
            await setPwaUserScope(String(user.id));
        } else if (error && !error.response && (userData as any)?.id) {
            await setPwaUserScope(String((userData as any).id));
        }
        return [error, res];
    });

    const clearUser = useMemoizedFn(async () => {
        syncUserData({});
        await clearPwaUserScope();
    });

    return {
        clearUser,
        login,
        registerEmailPassword,
        resetPassword,
        sendPasswordResetEmail,
        sendEmailLoginLink,
        loadCurrentUser,
        userData,
    };
};
