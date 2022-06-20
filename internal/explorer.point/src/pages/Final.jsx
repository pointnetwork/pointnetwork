import React, { useRef, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Swal from 'sweetalert2';
import axios from 'axios';
import Loading from '../components/Loading';

const DEFAULT_ERROR_MESSAGE = 'Something went wrong.';
const MAX_TWEET_SIZE = 280;

const TwitterIcon = (props) => {
    const { className, style } = props;
    return (
        <svg
            className={className}
            style={style}
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 16 16"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M15 3.784a5.63 5.63 0 0 1-.65.803 6.058 6.058 0 0 1-.786.68 5.442 5.442 0 0 1 .014.377c0 .574-.061 1.141-.184 1.702a8.467 8.467 0 0 1-.534 1.627 8.444 8.444 0 0 1-1.264 2.04 7.768 7.768 0 0 1-1.72 1.521 7.835 7.835 0 0 1-2.095.95 8.524 8.524 0 0 1-2.379.329 8.178 8.178 0 0 1-2.293-.325A7.921 7.921 0 0 1 1 12.52a5.762 5.762 0 0 0 4.252-1.19 2.842 2.842 0 0 1-2.273-1.19 2.878 2.878 0 0 1-.407-.8c.091.014.181.026.27.035a2.797 2.797 0 0 0 1.022-.089 2.808 2.808 0 0 1-.926-.362 2.942 2.942 0 0 1-.728-.633 2.839 2.839 0 0 1-.65-1.822v-.033c.402.227.837.348 1.306.362a2.943 2.943 0 0 1-.936-1.04 2.955 2.955 0 0 1-.253-.649 2.945 2.945 0 0 1 .007-1.453c.063-.243.161-.474.294-.693.364.451.77.856 1.216 1.213a8.215 8.215 0 0 0 3.008 1.525 7.965 7.965 0 0 0 1.695.263 2.15 2.15 0 0 1-.058-.325 3.265 3.265 0 0 1-.017-.331c0-.397.075-.77.226-1.118a2.892 2.892 0 0 1 1.528-1.528 2.79 2.79 0 0 1 1.117-.225 2.846 2.846 0 0 1 2.099.909 5.7 5.7 0 0 0 1.818-.698 2.815 2.815 0 0 1-1.258 1.586A5.704 5.704 0 0 0 15 3.785z"></path>
        </svg>
    );
};

const CopyIcon = (props) => {
    const { className, style } = props;
    return (
        <svg
            className={className}
            style={style}
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
        >
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
        </svg>
    );
};

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

    const [openingTwitter, setOpeningTwitter] = useState(false);

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
        const regex = new RegExp(
            `^https://twitter.com/${identity}/status/[0-9]+`,
            'i',
        );

        if (!regex.test(url)) {
            setTweetUrlError(
                'Cannot recognize the URL. It must be a URL of a tweet, and coming from the same identity handle.',
            );
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
    };

    const cancelRef = useRef();
    const debounced = useRef(null);
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
            axios
                .get(`/v1/api/identity/isIdentityEligible/${identity}`, {
                    cancelToken: new axios.CancelToken((c) => {
                        cancelRef.current = c;
                    }),
                })
                .then(({ data }) => {
                    setLoading(false);
                    const { eligibility, reason, code } = data.data;
                    setEligibility(eligibility);
                    if (reason) {
                        setError(reason);
                    }

                    // show an error if the handle is not available
                    if (!['free', 'tweet'].includes(eligibility) && !reason) {
                        setError('Handle is not available.');
                    }

                    if (code) {
                        setActivationCode(code);
                        resetTweetContent(code, identity);
                    }
                })
                .catch((thrown) => {
                    setLoading(false);
                    if (!axios.isCancel(thrown)) {
                        setError(DEFAULT_ERROR_MESSAGE);
                    }
                });
        }, 700);
    };

    const onChangeUrlHandler = (event) => {
        const url = event.target.value;

        if (!validateTweetUrl(url)) {
            return;
        }

        setTweetUrl(url);
    };

    const validateTweetContent = (content) => {
        if (content === '') {
            setTweetContentError('Tweet content cannot be empty');
            return false;
        }

        if (!/( |^)#pointnetwork( |$)/g.test(content)) {
            setTweetContentError('Tweet content must have #pointnetwork');
            return false;
        }

        if (!/( |^)#activation( |$)/g.test(content)) {
            setTweetContentError('Tweet content must have #activation');
            return false;
        }

        if (!/( |^)@pointnetwork( |$)/g.test(content)) {
            setTweetContentError('Tweet content must have @pointnetwork');
            return false;
        }

        if (content.length > MAX_TWEET_SIZE) {
            setTweetContentError('Tweet content is too long');
            return false;
        }

        const regex = new RegExp(
            `https://pointnetwork.io/activation\\?i=0x${activationCode}&handle=${identity}`,
            'g',
        );

        if (!regex.test(content)) {
            setTweetContentError(
                `Tweet content must have the activation link https://pointnetwork.io/activation?i=0x${activationCode}&handle=${identity}`,
            );
            return false;
        }

        setTweetContentError('');
        return true;
    };

    const onChangeTweetContentHandler = (event) => {
        const newContent = event.target.value;
        const isValidContent = validateTweetContent(newContent);
        if (isValidContent) {
            setTweetContent(newContent);
        }
    };

    const resetTweetContent = (code, identity) => {
        const defaultTweetContent = `Activating my Point Network handle! @pointnetwork https://pointnetwork.io/activation?i=0x${code}&handle=${identity} #pointnetwork #activation`;
        setTweetContent(defaultTweetContent);
        setTweetContentError('');
    };

    const registerHandler = async () => {
        try {
            const { isConfirmed } = await Swal.fire({
                title: 'Are you sure you want to be known as ' + identity + '?',
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
                resetTweetContent(code, identity);
                return;
            }

            if (!success) {
                Swal.fire({ title: reason || DEFAULT_ERROR_MESSAGE });
                return;
            }
            window.location = '/';
        } catch (error) {
            setRegistering(false);
            Swal.fire({ title: DEFAULT_ERROR_MESSAGE });
        }
    };

    async function openTwitterWithMessage() {
        setOpeningTwitter(true);
        const csrf_token = window.localStorage.getItem('csrf_token');
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            tweetContent,
        )}`;
        try {
            await axios({
                url: '/v1/api/identity/open',
                method: 'POST',
                data: {
                    url,
                    _csrf: csrf_token,
                },
            });
            setOpeningTwitter(false);
        } catch (error) {
            setOpeningTwitter(false);
        }
    }

    const identityAvailable = eligibility === 'free' || eligibility === 'tweet';

    const tweetSize = tweetContent.length;

    const tweetTooBig = tweetSize > MAX_TWEET_SIZE;

    return (
        <Container className="p-3 text-dark" style={{ color: '#353535' }}>
            <br />
            <h1>🎉 Final step</h1>
            <p className="text-medium">
                Introduce yourself to the world by registering an identity,
                which will be your public web3 handle:
            </p>

            <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="text"
                        name="handle"
                        className="p-1 my-2 text-medium"
                        onChange={onChangeHandler}
                        placeholder="Identity"
                        disabled={Boolean(registering)}
                    />
                    {loading ? (
                        <Loading
                            className="spinner-border text-secondary"
                            style={{
                                width: '20px',
                                height: '20px',
                                marginLeft: '5px',
                            }}
                        />
                    ) : (
                        ''
                    )}
                </div>

                {!identityAvailable ? (
                    <ul className="text-medium">
                        <li className="italic my-1">
                            If you have Twitter:{' '}
                            <span className="bold">
                                for the first 6 months after the launch
                            </span>{' '}
                            (including now) you have a chance to claim your
                            Twitter handle on web3 by{' '}
                            <span className="bold">
                                posting an activation tweet
                            </span>
                            , before it can be grabbed by cybersquatters. In
                            that case, enter your Twitter handle.
                        </li>
                        <li className="italic my-1">
                            If you don’t have Twitter or has been banned there:
                            you can enter any handle that is not on Twitter
                        </li>
                    </ul>
                ) : (
                    ''
                )}
            </div>

            {activationCode ? (
                <div className="py-3">
                    <h3 className="mb-2">Twitter validation</h3>
                    <p>Looks like this handle is registered on Twitter.</p>
                    <p className="text-medium">
                        If <span className="italic bold">@{identity}</span> on
                        Twitter is you and you want it on web3, we’re saving it
                        from cybersquatters{' '}
                        <span className="italic">
                            for the first 6 months from the launch
                        </span>
                        , so you can claim it by posting the activation tweet
                        below (feel free to change the starting text if you
                        want)
                    </p>
                    <p className="text-medium">
                        If <span className="italic bold">@{identity}</span> on
                        Twitter is not you, just select another handle that is
                        not on Twitter (if{' '}
                        <span className="italic bold">@{identity}</span> doesn’t
                        claim it in 6 months, you will be able to take it from
                        the automatic auction later)
                    </p>
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
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    position: 'absolute',
                                    left: '0px',
                                    bottom: '5px',
                                    width: '96%',
                                    margin: '0px 2%',
                                }}
                                className="my-2 py-2"
                            >
                                <button
                                    className="btn btn-light btn-sm"
                                    type="button"
                                    onClick={() =>
                                        resetTweetContent(
                                            activationCode,
                                            identity,
                                        )
                                    }
                                >
                                    Reset Tweet Content
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                    type="button"
                                    title="Copy Tweet content"
                                    onClick={() =>
                                        navigator.clipboard.writeText(
                                            tweetContent,
                                        )
                                    }
                                    disabled={tweetTooBig}
                                >
                                    <CopyIcon />
                                    <span className="mx-2">Copy</span>
                                </button>
                            </div>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                            className="py-2"
                        >
                            <div
                                className="red text-medium"
                                style={{
                                    paddingRight: '10px',
                                    flex: 1,
                                    lineBreak: 'anywhere',
                                }}
                            >
                                {tweetContentError}
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <div className="mr-5 green text-small">
                                    <span
                                        className="mr-10"
                                        style={{ fontStyle: 'italic' }}
                                    >
                                        When you click{' '}
                                        <strong>Send the Tweet</strong> (or it
                                        doesn’t work and you click{' '}
                                        <strong>Copy</strong> and send it
                                        manually), paste the tweet URL below ↓
                                    </span>
                                </div>
                                <div style={{ minWidth: '10px' }}></div>
                                <div
                                    className={
                                        tweetSize > MAX_TWEET_SIZE
                                            ? 'red bold text-medium'
                                            : 'text-medium'
                                    }
                                    style={{ flexShrink: 0 }}
                                >
                                    {tweetSize} characters
                                </div>
                                <button
                                    className="btn btn-primary btn-sm py-2 mx-2"
                                    onClick={openTwitterWithMessage}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                    disabled={tweetTooBig || openingTwitter}
                                >
                                    {openingTwitter ? (
                                        <Loading
                                            style={{
                                                width: '10px',
                                                height: '10px',
                                                marginRight: '5px',
                                            }}
                                        />
                                    ) : (
                                        <TwitterIcon
                                            className="text-large"
                                            style={{ marginRight: '5px' }}
                                        />
                                    )}
                                    <span>Send the Tweet</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="input-group" style={{ width: '100%' }}>
                        <input
                            type="text"
                            onChange={onChangeUrlHandler}
                            placeholder="Paste the URL of the tweet here when it’s posted"
                            className="text-medium form-control"
                        />
                        <div
                            className="input-group-append"
                            style={{ display: 'flex', alignItems: 'center' }}
                        >
                            {identity &&
                            identityAvailable &&
                            !error &&
                            (!activationCode ||
                                (tweetUrl && !tweetUrlError)) ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <button
                                        className="btn btn-info"
                                        onClick={registerHandler}
                                        disabled={Boolean(registering)}
                                    >
                                        {activationCode
                                            ? 'Check Tweet >>'
                                            : 'Register'}
                                    </button>
                                    {registering ? (
                                        <div
                                            className="spinner-border text-secondary"
                                            role="status"
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                marginLeft: '5px',
                                            }}
                                        ></div>
                                    ) : (
                                        ''
                                    )}
                                </div>
                            ) : (
                                ''
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {tweetUrlError ? (
                            <span
                                className="red text-medium"
                                style={{
                                    height: '35px',
                                    padding: '7px',
                                }}
                            >
                                {tweetUrlError}
                            </span>
                        ) : (
                            ''
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="text-small red">
                            Do not delete the tweet for at least 24 hours, to
                            prove it was not someone briefly compromising the
                            twitter account
                        </span>
                    </div>
                </div>
            ) : (
                ''
            )}

            {error ? (
                <div className="py-2 red text-medium">{error}</div>
            ) : eligibility === 'free' ? (
                <div className="py-2 green text-medium">
                    Great, this handle doesn’t seem to belong to a Twitter user!
                    You can claim it right now.
                </div>
            ) : (
                ''
            )}

            {identity &&
            identityAvailable &&
            !error &&
            !activationCode &&
            !tweetUrl &&
            !tweetUrlError ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        className="btn btn-info mt-2"
                        onClick={registerHandler}
                        disabled={Boolean(registering)}
                    >
                        Register
                    </button>
                    {registering ? (
                        <div
                            className="spinner-border text-secondary"
                            role="status"
                            style={{
                                width: '20px',
                                height: '20px',
                                marginLeft: '5px',
                            }}
                        ></div>
                    ) : (
                        ''
                    )}
                </div>
            ) : (
                ''
            )}
        </Container>
    );
};

export default Final;
