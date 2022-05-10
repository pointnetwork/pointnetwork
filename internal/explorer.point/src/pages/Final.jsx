import React, { useRef, useState } from 'react';
import Container from 'react-bootstrap/Container'
import Swal from 'sweetalert2';
import axios from 'axios'; 

const Final = () => {
    const [identity, setIdentity] = useState('');
    const [error, setError] = useState('');
    const [available, setAvailable] = useState(false);
    const [activationCode, setActivationCode] = useState('');
    const [tweetUrl, setTweetUrl] = useState('');

    function validate_identity(identity) {
        if (identity === '') {
            setError('empty identity');
            return;
        }
            
        if (!/^[a-zA-Z0-9]+?$/.test(identity)) {
            setError('special characters are not allowed');
            return;
        }

        if (identity.length > 16) {
            setError('handle is too long');
            return;
        }

        return true;
    }

    function validateTweetUrl(url) {        
        if (url === '') {
            setError('empty tweet url');
            return;
        }

        const regex = new RegExp(`^https://twitter.com/${identity}/status/[0-9]+$`);

        console.log('test', regex.test(url));

        if (!regex.test(url)) {
            setError('invalid tweet url');
            return;
        }

        setError('');

        return true;
    }

    const cleanForm = () => {
        setActivationCode('');
        setTweetUrl('');
        setIdentity('');
    }

    const source = useRef(axios.CancelToken.source());
    let debounced = useRef(null);
    const onChangeHandler = (event) => {
        const identity = event.target.value;
        if (!validate_identity(identity)) {
            return;
        }
        cleanForm();
        clearTimeout(debounced.current);
        debounced.current = setTimeout(() => {
            setError('');
            axios.get(`/v1/api/identity/identityToOwner/${identity}`, {
                cancelToken: source.current.token
            }).then(({ data }) => {
                const owner = (data || {}).owner;
                setIdentity(identity);
                setAvailable(!owner || owner === "0x0000000000000000000000000000000000000000");
            }).catch((thrown) => {
                if (!axios.isCancel(thrown)) {
                    console.error(thrown);
                    setError('Something went wrong')
                }
            })
        }, 300);
    } 

    const onChangeUrlHandler = (event) => {
        const url = event.target.value;

        if (!validateTweetUrl(url)) {
            return;
        }

        setTweetUrl(url);
    }

    const registerHandler = async () => {
        try {
            const { isConfirmed } = await Swal.fire({
                title: 'Are you sure you want to be known as '+identity+'?',
                showCancelButton: true,
                confirmButtonText: 'Sure!',
            });

            if (!isConfirmed) {
                return;
            }

            const csrf_token = window.localStorage.getItem('csrf_token');

            const { data: { data } } = await axios({
                url: '/v1/api/identity/register',
                method: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: {
                    identity,
                    _csrf: csrf_token,
                    code: activationCode,
                    url: tweetUrl,
                },
            });

            const { code } = data;
            if (code) {
                setError('');
                setActivationCode(code);
                return;
            }

            window.location = '/'; 
        } catch(error) {
            console.error(error);
            Swal.fire({title: 'Something went wrong'});
        };
    }

    let resultStyles = {};
    if (error) {
        resultStyles = { borderColor: 'red', color: 'red' };
    } else if (available) {
        resultStyles = { borderColor: 'green', color: 'green' };
    }

    const validationTweetContent = `Requesting the registration of this account on @pointnetwork. https://pointnetwork.io/activation/${activationCode}. #pointnetwork, #activation.`;

    return (
        <Container className="p-3">
            <br/>
            <h1>Final step</h1>
            <p>Introduce yourself to the world by registering an identity, which will be your public web3 handle:</p>

            <input type="text" name="handle" id="handle" onChange={onChangeHandler} />
            
            <br/>

            {activationCode ? (<div className="py-4">
                <h3>Twitter validation</h3>
                <p>Looks like this identity is own by a Twitter account. Twitter accounts have priority on Identity registrations.</p> 
                <p>If you are the owner please post this <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(validationTweetContent)}`}>Tweet</a> and add your tweet url below. <button className="btn btn-info" type="button" onClick={() => navigator.clipboard.writeText(validationTweetContent)}>Copy Tweet content</button></p>
                <input type="text" id="tweet-link" onChange={onChangeUrlHandler} placeholder="Paste your Tweet url here" style={{ width: '100%' }} />
            </div>) : ''}

            <div id="result" style={resultStyles} className="py-2">
                {error ? error : identity ? `${identity} ${available ? 'is available' : 'is not available'}`  : ''}
            </div>

            {identity && available && !error ? (<div>
                <button className="btn btn-info" onClick={registerHandler}>Register</button>
            </div>) : ''}
        </Container>
    )
}

export default Final;