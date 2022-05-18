import React, { useRef, useState } from 'react';
import Container from 'react-bootstrap/Container'
import Swal from 'sweetalert2';
import axios from 'axios'; 

const DEFAULT_ERROR_MESSAGE = 'Something went wrong.';
const MAX_TWEET_SIZE = 280;

const Final = () => {
    const [identity, setIdentity] = useState('');
    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);
    const [registering, setRegistering] = useState(false);

    const [eligibility, setEligibility] = useState('');

    const [activationCode, setActivationCode] = useState('');

    const [tweetUrl, setTweetUrl] = useState('');
    const [tweetUrlError, setTweetUrlError] = useState('');

    const [tweetContent, setTweetContent] = useState('');
    const [tweetContentError, setTweetContentError] = useState('');

    function validateIdentity(identity) {
        if (identity === '') {
            setError('Empty identity');
            return;
        }
            
        if (!/^[a-zA-Z0-9_]+?$/.test(identity)) {
            setError('Special characters are not allowed');
            return;
        }

        if (identity.length < 2) {
            setError('Handle is too short');
            return;
        }

        if (identity.length > 16) {
            setError('Handle is too long');
            return;
        }

        return true;
    }

    function validateTweetUrl(url) {        
        const regex = new RegExp(`^https://twitter.com/${identity}/status/[0-9]+`, 'i');

        if (!regex.test(url)) {
            setTweetUrlError('The Tweet Url must be a valid tweet status of the same identity name being registered');
            return;
        }

        setTweetUrlError('');

        return true;
    }

    const cleanForm = () => {
        setActivationCode('');

        setTweetContent('');
        setTweetContentError('');
        
        setTweetUrl('');
        setTweetUrlError('');

        setIdentity('');
        setEligibility('');
    }

    const cancelRef = useRef();
    let debounced = useRef(null);
    const onChangeHandler = (event) => {
        if (cancelRef.current) {
            cancelRef.current();
        }
        clearTimeout(debounced.current);
        const identity = event.target.value;
        cleanForm();
        if (!validateIdentity(identity)) {
            return;
        }
        setIdentity(identity);
        debounced.current = setTimeout(() => {
            setError('');
            setLoading(true);
            axios.get(`/v1/api/identity/isIdentityEligible/${identity}`, {
                cancelToken: new axios.CancelToken((c) => {
                    cancelRef.current = c;
                }),
            }).then(({ data }) => {
                setLoading(false);
                const { eligibility, reason, code } = data.data;
                setEligibility(eligibility)
                if (reason) {
                    setError(reason);
                } 

                if (eligibility === 'unavailable' && !reason) {
                    setError('Handle is not available.');
                }

                if (code) {
                    setActivationCode(code);
                    resetTweetContent(code, identity)
                    return;
                }
            }).catch((thrown) => {
                setLoading(false);
                if (!axios.isCancel(thrown)) {
                    console.error(thrown);
                    setError(DEFAULT_ERROR_MESSAGE);
                }
            })
        }, 700);
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
            setTweetContentError('Tweet content cannot be empty');
            return false;
        }

        if (!/#pointnetwork/g.test(content)) {
            setTweetContentError('Tweet content must have #pointnetwork');
            return false;
        }

        if (!/#activation/g.test(content)) {
            setTweetContentError('Tweet content must have #activation');
            return false;
        }

        if (!/@pointnetwork/g.test(content)) {
            setTweetContentError('Tweet content must have @pointnetwork');
            return false;
        }

        if (content.length > MAX_TWEET_SIZE) {
            setTweetContentError('Tweet content is too long');
            return false;
        }

        const regex = new RegExp(`https://pointnetwork.io/activation\\?i=0x${activationCode}&handle=${identity}`, 'g');

        if (!regex.test(content)) {
            setTweetContentError(`Tweet content must have the activation link https://pointnetwork.io/activation?i=0x${activationCode}&handle=${identity}`);
            return false;
        }

        setTweetContentError('');
        return true;
    }

    const onChangeTweetContentHandler = (event) => {
        const newContent = event.target.value;
        const isValidContent = validateTweetContent(newContent);
        if (isValidContent) {
            setTweetContent(newContent);
        }
    }

    const resetTweetContent = (code, identity) => {
        const defaultTweetContent = `Activating my Point Network handle! @pointnetwork https://pointnetwork.io/activation?i=0x${code}&handle=${identity} #pointnetwork #activation`;
        setTweetContent(defaultTweetContent);
        setTweetContentError('');
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

            setRegistering(true);
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
            
            setRegistering(false);

            const { code, success, reason } = data.data;

            if (code) {
                setActivationCode(code);
                resetTweetContent(code, identity)
                return;
            }

            if (!success) {
                Swal.fire({title: reason || DEFAULT_ERROR_MESSAGE});
                return;
            }
            window.location = '/'; 
        } catch(error) {
            setRegistering(false);
            console.error(error);
            Swal.fire({title: DEFAULT_ERROR_MESSAGE});
        };
    }

    const identityAvailable = eligibility === 'free' || eligibility === 'tweet';

    const tweetSize = tweetContent.length;

    return (
        <Container className="p-3 text-dark" style={{color: '#353535'}}>
            <br/>
            <h1>Final step</h1>
            <p className="text-medium">Introduce yourself to the world by registering an identity, which will be your public web3 handle:</p>

            <div>
                <div style={{display: 'flex', alignItems: 'center'}}>
                    <input type="text" name="handle" className="p-1 my-2 text-medium" onChange={onChangeHandler} placeholder="Identity" disabled={!!registering} />
                    {loading ? <div className="spinner-border text-secondary" role="status" style={{ width: '20px', height: '20px', marginLeft: '5px' }}></div> : ''}
                </div>

                {!identityAvailable ? (<ul className="text-medium">
                    <li className="italic my-1">If you have Twitter: <span className="bold">for the first 6 months after the launch</span> (including now) you have a chance to claim your Twitter handle on web3 by <span className="bold">posting an activation tweet</span>, before it can be grabbed by cybersquatters</li>
                    <li className="italic my-1">If you don’t have Twitter or has been banned there: you can enter any handle that is not on Twitter</li>
                </ul>) : ''}
            </div>
            
            {activationCode ? (<div className="py-3">
                <h3 className="mb-2">Twitter validation</h3>
                <p>Looks like this handle is registered on Twitter.</p> 
                <p className="text-medium">If <span className="italic bold">@{identity}</span> on Twitter is you and you want it on web3, we’re saving it from cybersquatters <span className="italic">for the first 6 months from the launch</span>, so you can claim it by posting the activation tweet below (feel free to change the starting text if you want)</p>
                <p className="text-medium">If <span className="italic bold">@{identity}</span> on Twitter is not you, just select another handle that is not on Twitter (if <span className="italic bold">@{identity}</span> doesn’t claim it in 6 months, you will be able to take it from the automatic auction later)</p>
                <div>
                    <div style={{ position: 'relative' }}>
                        <textarea
                            className="my-2 p-2 text-medium"
                            rows="8"
                            cols="50"
                            value={tweetContent}
                            onChange={onChangeTweetContentHandler}
                            style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'absolute', left: '0px', bottom: '5px', width: '96%', margin: '0px 2%'}} className="my-2 py-2">
                            <button className="btn btn-light btn-sm" type="button" onClick={() => resetTweetContent(activationCode, identity)}>Reset Tweet Content</button>
                            <button className="btn btn-link btn-sm bold" type="button" title="Copy Tweet content" onClick={() => navigator.clipboard.writeText(tweetContent)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}} className="py-2">
                        <div className="red text-medium" style={{paddingRight: '10px', flex: 1, lineBreak: 'anywhere'}}>{tweetContentError}</div>
                        <div className={tweetSize > MAX_TWEET_SIZE ? 'red bold text-medium' : 'text-medium'} style={{flexShrink: 0}}>{tweetSize} characters</div>
                    </div>
                </div>
                <div>
                    <input type="text" onChange={onChangeUrlHandler} placeholder="Paste your Tweet url here" style={{ width: '100%' }} className="my-2 p-1 text-medium" />
                    {tweetUrlError ? (<p className="red text-medium">{tweetUrlError}</p>) : ''}
                </div>
            </div>) : ''}

            {error ? (
                <div className="py-2 red text-medium">
                    {error}
                </div>) : eligibility === 'free' ? (
                <div className="py-2 green text-medium">
                    Great, this handle doesn’t seem to belong to a Twitter user! You can claim it right now.
                </div>
            ) : ''}

            {identity && identityAvailable && !error && (!activationCode || (tweetUrl && !tweetUrlError)) ? (<div style={{display: 'flex', alignItems: 'center'}}>
                <button className="btn btn-info mt-2" onClick={registerHandler} disabled={!!registering}>{activationCode ? 'Check Tweet >>' : 'Register'}</button>
                {registering ? <div className="spinner-border text-secondary" role="status" style={{ width: '20px', height: '20px', marginLeft: '5px' }}></div> : ''}
            </div>) : ''}
        </Container>
    )
}

export default Final;