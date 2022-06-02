import Container from 'react-bootstrap/Container';
import Loading from '../components/Loading';
import { useState,useEffect } from "react";
import { Link } from "wouter";
import orderBy from "lodash/orderBy";

export default function Identities({owner}) {
  
  const [identities, setIdentities] = useState([])
  const [ikvset, setIkvset] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(()=>{
    fetchIdentities();
  },[owner])

  const fetchIdentities = async () => {
    setIsLoading(true);
    let identitiesFetched = owner !== undefined
        ? 
        await window.point.contract.events(
        {host: '@', contract: 'Identity', event: 'IdentityRegistered', filter: {
          identityOwner: owner
        }}) 
        :
        await window.point.contract.events(
          {host: '@', contract: 'Identity', event: 'IdentityRegistered'})
        ;

    if (identitiesFetched.data != ''){
        const handleOrder = (identity) => identity.data.handle.toLowerCase();
        const blockOrder = 'blockNumber'
        const sortedIdentities = orderBy(identitiesFetched.data, [handleOrder, blockOrder], ['desc', 'desc']);
        setIdentities(sortedIdentities);
    } 


    let ikvsetFetched = await window.point.contract.events(
            {host: '@', contract: 'Identity', event: 'IKVSet'})
    if (ikvsetFetched.data != ''){
        setIkvset(ikvsetFetched.data);
    } 
    setIsLoading(false);
  }
 
  const renderIdentityEntry = (id) => {
    let domainExists = ikvset.filter((ikve) => 
        ikve.data.identity == id.handle && ikve.data.key == 'zdns/routes').length > 0;

    return (
        <tr key={id.handle}>
            <td><Link to={"/identities/" + id.handle} target="_blank">@{id.handle}</Link></td>
            <td className="mono">{id.identityOwner}</td>
            <td className="mono"><b>{domainExists ? <a href={'https://' +  id.handle + '.point' } target="_blank" rel="noreferrer">{id.handle + '.point'}</a>: ''}</b></td>
        </tr>
    )
  }

  return (
    <>
      <Container className="p-3">
        <br/>
        <h1>{owner !== undefined ? 'My ' : ''}Identities</h1>
        Total: {identities.length}

        <hr/>

        <table className="table table-bordered table-striped table-hover table-responsive table-primary">
            <tbody>
                <tr>
                    <th>Handle</th>
                    <th>Owner</th>
                    <th>App</th>
                </tr>
                {isLoading ? null : identities.map((e) => renderIdentityEntry(e.data))}
            </tbody>
        </table>
        {isLoading ? <Loading/> : null}
      </Container>
    </>
  );
}
