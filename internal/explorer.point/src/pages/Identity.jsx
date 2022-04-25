import Container from 'react-bootstrap/Container';
import BlockTime from '../components/BlockTime';
import { useState,useEffect } from "react";
import Loading from '../components/Loading';
import OwnerToIdentity from '../components/OwnerToIdenity';
import Swal from 'sweetalert2';


export default function Identity({params: {handle}}) {
    
    const [ikvset, setIkvset] = useState([])
    const [owner, setOwner] = useState()
    const [publicKey, setPublicKey] = useState('')
    const [deployers, setDeployers] = useState([])
    const [isLoadingOwner, setIsLoadingOwner] = useState(true)
    const [isLoadingPublicKey, setIsLoadingPublicKey] = useState(true)
    const [isLoadingIkv, setIsLoadingIkv] = useState(true)
    const [isLoadingDeployers, setIsLoadingDeployers] = useState(true)
    const [isOwner, setIsOwner] = useState(false)
    const [addAddress, setAddAddress] = useState('')

    useEffect(()=>{
        fetchOwner();
        fetchPublicKey();
        fetchIkv();
        fetchDeployers();
    },[])

    
    const fetchOwner = async () => {
        setIsLoadingOwner(true);
        const result = await window.point.identity.identityToOwner({identity: handle});
        setOwner(result.data.owner);
        setIsLoadingOwner(false);
        const resultAddr = await window.point.wallet.address();
        setIsOwner(result.data.owner ===  resultAddr.data.address);
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

    const fetchDeployers = async () => {
        setIsLoadingDeployers(true);
        let deployersFetched = await window.point.contract.events(
            {host: '@', contract: 'Identity', event: 'IdentityDeployerChanged', filter: {identity: handle}})
        if (deployersFetched.data != ''){
            setDeployers(deployersFetched.data);
        } 
        setIsLoadingDeployers(false);
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

    const renderDeployerEntry = (deployer) => {

        const lastEntry = deployers.filter((e) => e.data.deployer === deployer).reduce((prev, current) =>
            prev.blockNumber > current.blockNumber ? prev : current
        );
        return (
            <tr key={deployer}>
                <th><OwnerToIdentity owner={deployer} /></th>
                <td>{deployer}</td>
                <td>
                    {lastEntry.data.allowed === true ? "Allowed" : "Revoked"}
                </td>
                <td>
                    <BlockTime blockNumber={lastEntry.blockNumber}/>
                </td>
                {isOwner ? 
                    <td>
                        {lastEntry.data.allowed === true ?
                        <button className="btn btn-sm btn-danger" onClick={() => revokeDeployer(deployer)}>Revoke</button>  : 
                        <button className="btn btn-sm btn-primary" onClick={() => activateDeployer(deployer)}>Reactivate</button> }
                    </td>
                : null}
            </tr>
        )
    }

    const EmptyMsg = () => ikvset.length === 0 ? <div><em>No records found</em></div> : '';


    const handleChange = (e) => {
        setAddAddress(e.target.value);
    }

    const addDeployer = async () =>{
       const result = await activateDeployer(addAddress);
       if(result){
           setAddAddress('');
       }
       
    }

    const revokeDeployer = async (deployer) =>{
        try{
            setIsLoadingDeployers(true);
            await window.point.contract.send({
                host: '@',
                contract: 'Identity',
                method: 'removeIdentityDeployer',
                params: [
                    handle,
                    deployer
                ]
            });
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Deployer removed with success!',
            });
            fetchDeployers();
        }catch(e){
            Swal.fire({
                icon: 'error',
                title: 'Request Failed',
                text: e,
            });
            setIsLoadingDeployers(false);
        }        
    }

    const activateDeployer = async (deployer) =>{
        try{
            setIsLoadingDeployers(true);
            await window.point.contract.send({
                host: '@',
                contract: 'Identity',
                method: 'addIdentityDeployer',
                params: [
                    handle,
                    deployer
                ]
            });
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Deployer added with success!',
            });
            fetchDeployers();
            return true;
        }catch(e){
            Swal.fire({
                icon: 'error',
                title: 'Request Failed',
                text: e,
            });
            setIsLoadingDeployers(false);
            return false;
        } 
    }

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

            <h3>Deployers:</h3>
            {
                isOwner 
                    ? 
                    <div className="row g-3">
                        <div className="col-sm-4">
                            <input type="text" name="addAddress" className="form-control" placeholder="Address" value={addAddress} onChange={handleChange} />
                        </div> 
                        <div className="col-sm-8">
                            <button className="btn btn-primary mb-2" onClick={() => addDeployer()}>Add</button> 
                        </div>
                    </div> 
                    : null
            }
            {
                isLoadingDeployers
                ?
                <Loading />
                :
                <>
                    <table className="table table-bordered table-primary table-striped table-hover table-responsive">
                        <tbody>
                            {[...new Set(deployers.map((e) => e.data.deployer))].map((deployer) => renderDeployerEntry(deployer))}
                        </tbody>
                    </table>
                    <EmptyMsg />
                </>
            }


        </Container>
    );
}
