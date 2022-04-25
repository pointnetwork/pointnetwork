import { useState,useEffect } from "react";
import Loading from '../components/Loading';

const OwnerToIdentity = ({owner}) => {

    const [isLoading, setIsLoading] = useState(true);
    const [identity, setIdentity] = useState();

    useEffect(()=>{
        fetchOwner();
    },[]);

    const fetchOwner = async () => {
        setIsLoading(true);
        const result = await window.point.identity.ownerToIdentity({owner: owner});
        setIdentity(result.data.identity);
        setIsLoading(false);
    }

    return(
        isLoading ? <Loading/> : '@' + identity
    );
}

export default OwnerToIdentity;