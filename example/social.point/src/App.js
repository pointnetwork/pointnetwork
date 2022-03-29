import { ProvideAppContext } from './context/AppContext'
import { Route } from 'wouter'
import Home from './pages/home/Home'
import Profile from './pages/profile/Profile'

const Main = () => {
    return (
        <main>
            <Route path='/'>
                <Home/>
            </Route>
            <Route path="/profile/:account">
                <Profile />
            </Route>
        </main>
    )
}

const App = () => <ProvideAppContext><Main/></ProvideAppContext>
export default App;