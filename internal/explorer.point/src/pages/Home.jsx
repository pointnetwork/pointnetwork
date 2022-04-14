import Container from 'react-bootstrap/Container'
import { useState,useEffect } from "react";
import { useAppContext } from '../context/AppContext';

export default function Home() {
  const { walletIdentity } = useAppContext();
  const [zapps, setZapps] = useState([])

  const featuredZapps = {
    'blog.point': "Blog",
    'social.point': 'Point Social',
    'email.point': 'Email',
  }

  useEffect(()=>{
    fetchZappsDeployed();
  },[])

  const fetchZappsDeployed = async () => {
    let zappsDeployed = [];
    for (let k in featuredZapps){

      let zappRoutes = await window.point.contract.call({host: '@', contract: 'Identity', 
      method: 'ikvGet',  params: [k.replace('.point', ''),'zdns/routes']});
      if(zappRoutes.data !== ''){
        zappsDeployed.push(k);
      }
    }
    setZapps(zappsDeployed);
  }

  const renderZappEntry = (k) => {
    return (
        <li><a href={ 'https://' + k } target="_blank">{ k } &mdash; { featuredZapps[k] }</a></li>
    )
  }

  let zappsList = <p>No ZApp deployed yet.</p>;
  if(zapps.length > 0){
    zappsList = <ul>{zapps.map((k) => renderZappEntry(k))}</ul>;
  }

  return (
    <>
      <Container className="p-3">
        <br/>
        <br/>
        <h1 className="header">Welcome to Web 3.0, <strong>@{walletIdentity}</strong>!</h1>
        <p>If you can see this page, this means you've successfully installed the alpha! You're amazing! Please send the screenshot to the group.</p>
        <p>There's not much content in here, but we will be filling it up from now on</p>

        <h5>Explore deployed websites</h5>
        {zappsList}
      </Container>
    </>
  );
}
