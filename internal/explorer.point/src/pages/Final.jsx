import React, { useRef, useState } from 'react';
import Container from 'react-bootstrap/Container'
import Swal from 'sweetalert2';
import axios from 'axios'; 

const Final = () => {
    const [identity, setIdentity] = useState('');
    const [error, setError] = useState('');
    const [available, setAvailable] = useState(false);

    function validate_identity(identity) {
        if (identity === '') {
            setError('empty identity');
            return;
        }
            
        if (! /^[a-zA-Z0-9]+?$/.test(identity)) {
            setError('special characters are not allowed');
            return;
        }

        if (identity.length > 16) {
            setError('handle is too long');
            return;
        }

        return true;
    }

    const source = useRef(axios.CancelToken.source());
    let debounced = useRef(null);
    const onChangeHandler = (event) => {
        const identity = event.target.value;
        if (!validate_identity(identity)) {
            return;
        }
        setIdentity('');
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

    const registerHandler = () => {
        Swal.fire({
            title: 'Are you sure you want to be known as '+identity+'?',
            showCancelButton: true,
            confirmButtonText: 'Sure!',
        }).then(({ isConfirmed }) => {
            if (!isConfirmed) {
                return;
            }

            const csrf_token = window.localStorage.getItem('csrf_token');

            axios({
                url: '/v1/api/identity/register',
                method: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: {
                    identity,
                    _csrf: csrf_token,
                },
            }).then(() => {
                window.location = '/';
            }).catch((error) => {
                console.error(error);
                Swal.fire({title: 'Something went wrong'});
            });
        })
    }

    let resultStyles = {};
    if (error) {
        resultStyles = { borderColor: 'red', color: 'red' };
    } else if (available) {
        resultStyles = { borderColor: 'green', color: 'green' };
    }

    return (
        <Container className="p-3">
            <br/>
            <h1>Final step</h1>
            <p>Introduce yourself to the world by registering an identity, which will be your public web3 handle:</p>

            <input type="text" name="handle" id="handle" onChange={onChangeHandler} />

            <div id="result" style={resultStyles}>
                {error ? error : identity ? `${identity} ${available ? 'is available' : 'is not available'}`  : ''}
            </div>
            
            <br/>

            {identity && available && !error ? (<div>
                <button className="btn btn-info" onClick={registerHandler}>Register</button>
            </div>) : ''}
        </Container>
    )
}

export default Final;