import React from 'react';
import Container from 'react-bootstrap/Container';
import Loading from '../../components/Loading';
import CopyIcon from '../../components/icons/CopyIcon';
import TwitterIcon from '../../components/icons/TwitterIcon';
import useFinal, { MAX_TWEET_SIZE } from './useFinal';

const Final = () => {
    const {
        identity,
        error,
        loading,
        registering,
        eligibility,
        activationCode,
        tweetUrl,
        tweetUrlError,
        tweetContent,
        tweetContentError,
        openingTwitter,
        identityAvailable,
        tweetSize,
        tweetTooBig,
        onChangeHandler,
        onChangeUrlHandler,
        onChangeTweetContentHandler,
        resetTweetContent,
        registerHandler,
        openTwitterWithMessage,
    } = useFinal();

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
