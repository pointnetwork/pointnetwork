import React, { useRef, useState } from 'react';
import Container from 'react-bootstrap/Container'
import Swal from 'sweetalert2';
import axios from 'axios'; 

const DEFAULT_ERROR_MESSAGE = 'Something went wrong.';

const Final = () => {
    const [identity, setIdentity] = useState('');
    const [error, setError] = useState('');

    const [available, setAvailable] = useState(false);

    const [activationCode, setActivationCode] = useState('');

    const [tweetUrl, setTweetUrl] = useState('');
    const [tweetUrlError, setTweetUrlError] = useState('');

    const [tweetContent, setTweetContent] = useState('');
    const [tweetContentError, setTweetContentError] = useState('');

    function validateIdentity(identity) {

        if (!identity || identity === '') {
            setError('empty identity');
            return;
        }

        if (identity.length < 2) {
            setError('handle is too short');
            return;
        }

        if (!/^[a-zA-Z0-9_]+?$/.test(identity)) {
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
            setTweetUrlError('empty tweet url');
            return;
        }

        const regex = new RegExp(`^https://twitter.com/${identity}/status/[0-9]+$`);

        if (!regex.test(url)) {
            setTweetUrlError('invalid tweet url');
            return;
        }

        setTweetUrlError('');

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
        if (!validateIdentity(identity)) {
            return;
        }
        cleanForm();
        clearTimeout(debounced.current);
        debounced.current = setTimeout(() => {
            setError('');
            axios.get(`/v1/api/identity/isIdentityEligible/${identity}`, {
                cancelToken: source.current.token
            }).then(({ data }) => {
                console.log(data);
                const { eligibility, reason } = data.data;
                const available = eligibility === 'free' || eligibility === 'tweet';
                if (available) {
                    setIdentity(identity);
                    setAvailable(true);
                } else {
                    setError(reason);
                    setAvailable(false);
                }
            }).catch((thrown) => {
                if (!axios.isCancel(thrown)) {
                    console.error(thrown);
                    setError(DEFAULT_ERROR_MESSAGE);
                }
            })
        }, 500);
    } 

    const onChangeUrlHandler = (event) => {
        const url = event.target.value;

        if (!validateTweetUrl(url)) {
            return;
        }

        setTweetUrl(url);
    }

    const validateTweetContent = (content) => {
        if (content === '') {
            setTweetContentError('tweet content cannot be empty');
            return;
        }

        if (!/#pointnetwork/g.test(content)) {
            setTweetContentError('tweet content must have #pointnetwork');
            return;
        }

        if (!/#activation/g.test(content)) {
            setTweetContentError('tweet content must have #activation');
            return;
        }

        if (!/@pointnetwork/g.test(content)) {
            setTweetContentError('tweet content must have @pointnetwork');
            return;
        }

        const regex = new RegExp(`https://pointnetwork.io/activation/${activationCode}`, 'g');
        if (!regex.test(content)) {
            setTweetContentError(`tweet content must have the activation link https://pointnetwork.io/activation/${activationCode}`);
            return;
        }

        setTweetContentError('');
    }

    const onChangeTweetContentHandler = (event) => {
        const newContent = event.target.value;
        validateTweetContent(newContent);
        setTweetContent(newContent);
    }

    const resetTweetContent = (code) => {
        const defaultTweetContent = `Activating my Point Network handle! @pointnetwork. https://pointnetwork.io/activation/${activationCode || code}. #pointnetwork, #activation.`;
        setTweetContent(defaultTweetContent);
        validateTweetContent(defaultTweetContent);
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

            setError('');

            const csrf_token = window.localStorage.getItem('csrf_token');

            const { data } = await axios({
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

            const { code, success, reason } = data.data;

            if (code) {
                setActivationCode(code);
                resetTweetContent(code)
                return;
            }

            if (!success) {
                setError(reason || DEFAULT_ERROR_MESSAGE);
                return;
            }

            window.location = '/'; 
        } catch(error) {
            console.error(error);
            Swal.fire({title: DEFAULT_ERROR_MESSAGE});
        };
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

            <div className="py-2">
                <input type="text" name="handle" id="handle" className="p-1" onChange={onChangeHandler} />
            </div>
            
            {activationCode ? (<div className="py-2">
                <h3>Twitter validation</h3>
                <p>Looks like this identity is own by a Twitter account. Twitter accounts have priority on Identity registrations.</p> 
                <p>If you are the owner please post a tweet with this content and add your tweet url below.</p>
                <p>It should include the @pointnetwork tag, the activation link and the hashtags #pointnetwork and #activation</p>
                <div>
                    <textarea
                        className="my-2 p-1"
                        rows="8"
                        cols="50"
                        value={tweetContent}
                        onChange={onChangeTweetContentHandler}
                        style={{ width: '100%' }}
                    />
                    {tweetContentError ? (<p style={{color: 'red'}}>{tweetContentError}</p>) : ''}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between'}} className="my-2 py-2">
                    <button className="btn btn-info" type="button" onClick={() => navigator.clipboard.writeText(tweetContent)}>Copy Tweet content</button>
                    <button className="btn btn-info" type="button" onClick={resetTweetContent}>Reset Tweet Content</button>
                </div>
                <input type="text" id="tweet-link" onChange={onChangeUrlHandler} placeholder="Paste your Tweet url here" style={{ width: '100%' }} className="my-2 p-1" />
                {tweetUrlError ? (<p style={{color: 'red'}}>{tweetUrlError}</p>) : ''}
            </div>) : ''}

            <div id="result" style={resultStyles} className="py-2">
                {error ? error : identity && !activationCode ? `${identity} ${available ? 'is available' : 'is not available'}`  : ''}
            </div>

            {identity && available && !error && (!activationCode || tweetUrl) ? (<div>
                <button className="btn btn-info" onClick={registerHandler}>Register</button>
            </div>) : ''}
        </Container>
    )
}

export default Final;