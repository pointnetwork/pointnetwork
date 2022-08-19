import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from 'react';
import { useLocation } from 'wouter';

const defaultContext = {
    walletAddress: undefined,
    walletError: undefined,
    goHome: () => {},
};

const AppContext = createContext(defaultContext);

export const useAppContext = () => useContext(AppContext);

export const ProvideAppContext = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [walletIdentity, setWalletIdentity] = useState('');
    const [identityNetwork, setIdentityNetwork] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [walletAddr, setWalletAddr] = useState('');
    const [walletError, setWallerError] = useState();
    const [, setLocation] = useLocation();

    const fetchData = async () => {
        try {
            let identityData = {};
            if (window.point && window.point.identity.me) {
                const resp = await window.point.identity.me();
                identityData = resp.data;
            } else {
                const resp = await fetch(
                    '/v1/api/identity/isIdentityRegistered/',
                );
                const data = await resp.json();
                identityData = data.data;
            }

            setWalletIdentity(identityData.identity);
            setWalletAddr(identityData.address);
            setPublicKey(identityData.publicKey);
            setIdentityNetwork(identityData.network);
        } catch (e) {
            setWallerError(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const goHome = useCallback(async () => {
        setLocation('/');
    }, []);

    const context = {
        isLoading,
        walletIdentity,
        identityNetwork,
        publicKey,
        walletAddr,
        walletError,
        goHome,
    };

    return (
        <AppContext.Provider value={context}>{children}</AppContext.Provider>
    );
};
