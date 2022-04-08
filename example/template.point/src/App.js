import { ProvideAppContext } from './context/AppContext'
import { Route } from 'wouter'
import Header from './components/Header';
import Footer from "./components/Footer";
import Home from './pages/Home'
import Examples from './pages/Examples'
import Contracts from './pages/Contracts'

const Main = () => {
    return (
        <main>
            <Header />
                <Route path='/'>
                    <Home/>
                </Route>
                <Route path='/examples'>
                    <Examples/>
                </Route>
                <Route path='/contracts'>
                    <Contracts/>
                </Route>
            <Footer />
        </main>
    )
}

export default App = () => <ProvideAppContext><Main/></ProvideAppContext>