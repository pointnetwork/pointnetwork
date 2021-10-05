import { ProvideAppContext } from './context/AppContext'
import { Route } from 'wouter'
import Home from './pages/home/home'

const Main = () => {
    return (
        <main>
            <Route path='/'>
                <Home/>
            </Route>
        </main>
    )
}

export default App = () => <ProvideAppContext><Main/></ProvideAppContext>