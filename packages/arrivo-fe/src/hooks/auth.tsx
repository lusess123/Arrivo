import { asyncHandle } from "@/lib";
import { useRootStore } from "./store";
import { useMemoizedFn, useLocalStorageState } from 'ahooks'
import axios from "axios";
import { useEffect } from "react";


export const useAuth = () => {
    const store = useRootStore();
    const [userData, setUserData] = useLocalStorageState('userData', { defaultValue: {} });
    useEffect(() => {
        if (userData) {
            store.setUserData(userData);
        }
    }, []);
    const login = useMemoizedFn(async (phone: string, code: string) => {
        const [error, res] = await asyncHandle(axios.post('/api/auth/phonenumberlogin', {
            phoneNumber: phone,
            phoneNumberCode: code,
        }));
        if (!error) {
            console.log('res:', res);
            store.setUserData(res?.data?.data?.payload);
            setUserData(res?.data?.data?.payload);
        }
        return [error, res];
    });
    return {
        login,
        userData,
    };
};
