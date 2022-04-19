import Container from 'react-bootstrap/Container';
import BlockTime from '../components/BlockTime';
import { useState,useEffect } from "react";
import Loading from '../components/Loading';


export default function Identity({params: {handle}}) {
    
    const [ikvset, setIkvset] = useState([])
    const [owner, setOwner] = useState()
    const [publicKey, setPublicKey] = useState('')
    const [isLoadingOwner, setIsLoadingOwner] = useState(true)
    const [isLoadingPublicKey, setIsLoadingPublicKey] = useState(true)
    const [isLoadingIkv, setIsLoadingIkv] = useState(true)

    useEffect(()=>{
        fetchOwner();
        fetchPublicKey();
        fetchIkv();
    },[])

    const fetchOwner = async () => {
        setIsLoadingOwner(true);
        const result = await window.point.identity.identityToOwner({identity: handle});
        setOwner(result.data.owner);
        setIsLoadingOwner(false);
    }

    const fetchPublicKey = async () => {
        setIsLoadingPublicKey(true);
        const result = await window.point.identity.publicKeyByIdentity({identity: handle});
        setPublicKey(result.data.publicKey);
        setIsLoadingPublicKey(false);
    }

    const fetchIkv = async () => {
        setIsLoadingIkv(true)
        let ikvsetFetched = await window.point.contract.events(
                {host: '@', contract: 'Identity', event: 'IKVSet', filter: {identity: handle}})
        if (ikvsetFetched.data != ''){
            setIkvset(ikvsetFetched.data);
        } 
        setIsLoadingIkv(false)
    }

    const isHash = (str) => {
        const s = str.startsWith('0x') ? str.substr(2) : str;
        if (s.length !== 64) return false;
        return new RegExp('^[0-9a-fA-F]+$').test(s);
    }
    
    const renderIkvEntry = (key) => {

        const lastEntry = ikvset.filter((e) => e.data.key === key).reduce((prev, current) =>
            prev.blockNumber > current.blockNumber ? prev : current
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
                    <BlockTime blockNumber={lastEntry.blockNumber}/>
                </td>
                <td>
                    {lastEntry.data.version}
                </td>
            </tr>
        )
    }

    const EmptyMsg = () => ikvset.length === 0 ? <div><em>No records found</em></div> : '';

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
                    <td>{isLoadingOwner ? <Loading /> : owner}</td>
                </tr>
                <tr>
                    <th>Domain Space:</th>
                    <td><a href={"https://" + handle + ".point/"} target="_blank">{handle}.point</a></td>
                </tr>
                <tr>
                    <th>Communication Public Key:</th>
                    <td className="overflow-wrap: break-word;">
                        {isLoadingPublicKey ? <Loading /> : publicKey.replace('0x', '').match(/.{1,8}/g)?.map((part) => part + ' ')}
                    </td>
                </tr>
                </tbody>
            </table>

            <h3>Identity Key Value Store (ikv):</h3>

            {
                isLoadingIkv
                ?
                <Loading />
                :
                <>
                    <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                        <tbody>
                            {[...new Set(ikvset.map((e) => e.data.key))].map((key) => renderIkvEntry(key))}
                        </tbody>
                    </table>
                    <EmptyMsg />
                </>
            }

        </Container>
    );
}
