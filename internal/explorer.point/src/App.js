import { ProvideAppContext, useAppContext } from './context/AppContext';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Identities from './pages/Identities';
import MyIdentities from './pages/MyIdentities';
import Identity from './pages/Identity';
import Final from './pages/Final';
import Wallet from './pages/Wallet';
import Zapps from './pages/Zapps';
import Loading from './components/Loading';
import ErrorBlock from './components/ErrorBlock';
import DeployBlog from './pages/DeployBlog';

const Main = () => {
    const { walletIdentity, walletAddr, isLoading, walletError } =
        useAppContext();

    const renderWalletIdentityMissing = () => {
        if (walletError) {
            return (
                <ErrorBlock details="SDK is not installed or broken"></ErrorBlock>
            );
        } else {
            return <Final></Final>;
        }
    };

    return (
        <main>
            {isLoading ? (
                <Loading />
            ) : (
                <>
                    <Header isRegistered={Boolean(walletIdentity)} />
                    {walletIdentity ? (
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/wallet" element={<Wallet />} />
                            <Route
                                path="/identities/:handle"
                                element={<Identity />}
                            />
                            <Route
                                path="/identities"
                                element={<Identities />}
                            />
                            <Route path="/zapps" element={<Zapps />} />
                            <Route
                                path="/myidentities"
                                element={<MyIdentities owner={walletAddr} />}
                            />
                            <Route
                                path="/deploy_blog"
                                element={<DeployBlog />}
                            />
                        </Routes>
                    ) : (
                        renderWalletIdentityMissing()
                    )}
                </>
            )}
        </main>
    );
};

const App = () => (
    <BrowserRouter>
        <ProvideAppContext>
            <Main />
        </ProvideAppContext>
    </BrowserRouter>
);

export default App;
