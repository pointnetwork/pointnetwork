import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
    const { search, pathname } = useLocation();

    const fetchData = async () => {
        try {
            const token = await window.point.point.get_auth_token();
            // If token is not set, it should be saved and then the page should be redirected,
            // so this function will trigger again. But let's keep a console log for the case
            // when it's missing completely
            if (!token) {
                console.error('No auth token found in SDK');
                return;
            }
            const resp = await window.point.identity.me();
            const identityData = resp.data;

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
        if (window.point) {
            fetchData();
        }
    }, [window.point]);

    const goHome = useCallback(() => {
        navigate('/');
    }, []);

    const setAuthToken = async (tkn) => {
        const res = await window.point.point.set_auth_token(tkn);
        if (!res.ok) {
            throw new Error('Failed to set point auth token');
        }
        navigate(pathname);
        fetchData();
    };

    const token = useMemo(() => {
        const query = new URLSearchParams(search);
        return query.get('token');
    }, [search]);

    useEffect(() => {
        if (token) {
            setAuthToken(token);
        }
    }, [token]);

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
