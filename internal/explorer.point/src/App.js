import { ProvideAppContext, useAppContext } from './context/AppContext';
import { Route, Switch } from 'wouter';
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
                        <Switch>
                            <Route path="/">
                                <Home />
                            </Route>
                            <Route path="/wallet">
                                <Wallet />
                            </Route>
                            <Route path="/identities/:handle">
                                <Identity />
                            </Route>
                            <Route path="/identities">
                                <Identities />
                            </Route>
                            <Route path="/zapps">
                                <Zapps />
                            </Route>
                            <Route path="/myidentities">
                                <MyIdentities owner={walletAddr} />
                            </Route>
                            <Route path="/deploy_blog">
                                <DeployBlog />
                            </Route>
                        </Switch>
                    ) : (
                        renderWalletIdentityMissing()
                    )}
                </>
            )}
        </main>
    );
};

const App = () => (
    <ProvideAppContext>
        <Main />
    </ProvideAppContext>
);

export default App;
