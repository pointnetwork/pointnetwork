import Header from './components/Header'
import Footer from './components/Footer'
import Statuses from './components/Statuses';
import { useEffect, useState } from 'react';

const App = () => {
  const [statuses, setStatuses] = useState([])

  useEffect(() => {
    const getStatuses = async () => {
      const statuses = await fetchStatuses()
      setStatuses(statuses)
    }

    getStatuses()
  }, [])

  const fetchStatuses = async () => {
    // TODO actuall fetch from point node using point sdk
    const data = [
      {
        id: 1,
        title: 'Feelin good today!'
      },
      {
        id: 2,
        title: 'Even better now :)'
      }]

    return data
  }

  return (
    <div>
      <Header />
      <div className='container'>
        {
          statuses.length > 0 ? <Statuses statuses={ statuses } />: 'No statuses to show!'
        }
      </div>
      <Footer />
    </div>
  );
}

export default App;