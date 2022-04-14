import Container from 'react-bootstrap/Container'
import { useState,useEffect } from "react";

export default function Identity({params: {handle}}) {
    
    const [ikvset, setIkvset] = useState([])
    const [owner, setOwner] = useState()
    const [publicKey, setPublicKey] = useState('')

    useEffect(()=>{
        fetchOwner();
        fetchPublicKey();
        fetchIkv();
    },[])

    const fetchOwner = async () => {
        const result = await window.point.identity.IdentityToOwner({identity: handle});
        setOwner(result.data.owner);
    }

    const fetchPublicKey = async () => {
        const result = await window.point.identity.publicKeyByIdentity({identity: handle});
        setPublicKey(result.data.publicKey);
    }

    const fetchIkv = async () => {
        let ikvsetFetched = await window.point.contract.events(
                {host: '@', contract: 'Identity', event: 'IKVSet', filter: {identity: handle}})
        if (ikvsetFetched.data != ''){
            console.log(ikvsetFetched.data);
            setIkvset(ikvsetFetched.data);
            console.log(ikvset.map((e) => e.data.key));
        } 
    }

    const isHash = (str) => {
        const s = str.startsWith('0x') ? str.substr(2) : str;
        if (s.length !== 64) return false;
        return new RegExp('^[0-9a-fA-F]+$').test(s);
    }
    
    const renderIkvEntry = (key) => {

        const lastEntry = ikvset.filter((e) => e.data.key === key).reduce((prev, current) =>
            prev.timestamp > current.timestamp ? prev : current
        );
        return (
            <tr key={key}>
                <th>{key}</th>
                <td>
                    {
                        isHash(lastEntry.data.value) 
                        ? <a href={"/_storage/" + lastEntry.data.value} target="_blank">{lastEntry.data.value}</a>
                        : lastEntry.data.value
                    }
                </td>
                <td>
                    {new Date(lastEntry.timestamp * 1000).toUTCString()}
                </td>
                <td>
                    {lastEntry.data.version}
                </td>
            </tr>
        )
    }

    const emptyMsg = ikvset.length === 0 ? <div><em>No records found</em></div> : '';

    return (
        <Container className="p-3">
            <br/>
            <h1>Identity @{handle}</h1>

            <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                <tbody>
                <tr>
                    <th>Handle:</th>
                    <td>@{handle}</td>
                </tr>
                <tr>
                    <th>Owner:</th>
                    <td>{owner}</td>
                </tr>
                <tr>
                    <th>Domain Space:</th>
                    <td><a href={"https://" + handle + ".point/"} target="_blank">{handle}.point</a></td>
                </tr>
                <tr>
                    <th>Communication Public Key:</th>
                    <td className="overflow-wrap: break-word;">
                        {publicKey.replace('0x', '').match(/.{1,8}/g)?.map((part) => part + ' ')}
                    </td>
                </tr>
                </tbody>
            </table>

            <h3>Identity Key Value Store (ikv):</h3>

            <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                <tbody>
                    {[...new Set(ikvset.map((e) => e.data.key))].map((key) => renderIkvEntry(key))}
                </tbody>
            </table>

            {emptyMsg}

        </Container>
    );
}
