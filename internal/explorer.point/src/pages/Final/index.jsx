import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Accordion from 'react-bootstrap/Accordion';
import Loading from '../../components/Loading';
import CopyIcon from '../../components/icons/CopyIcon';
import TwitterIcon from '../../components/icons/TwitterIcon';
import ExclamationCircleFill from '../../components/icons/ExclamationCircleFill';
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
        // setIdentity,
        identityAvailable,
        tweetSize,
        tweetTooBig,
        onChangeHandler,
        onChangeUrlHandler,
        onChangeTweetContentHandler,
        resetTweetContent,
        isTweetContentUnchanged,
        registerHandler,
        openTwitterWithMessage,
        suggestions,
        suggestionsAvailability,
        // identityTextboxRef
    } = useFinal();

    let mode = 'default';
    if (activationCode) mode = 'twitter';
    if (error) mode = 'error';
    if (
        identity &&
        identityAvailable &&
        !error &&
        !activationCode &&
        !tweetUrl &&
        !tweetUrlError
    )
        mode = 'continue';
    if (loading) mode = 'empty';

    // const identityInputColor = error ? 'red' : 'white';
    const identityInputColor = 'white';

    return (
        <Container className="p-3 text-dark" style={{ color: '#353535' }}>
            <form className="introduce-yourself-form">
                <div className="introduce-yourself-form-inside">
                    <h2>🎉 Final Step</h2>

                    <div className="name-block">
                        <label htmlFor="name">
                            Introduce yourself to the world:
                        </label>
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                type="text"
                                name="handle"
                                className="p-1 my-2 text-medium"
                                onChange={onChangeHandler}
                                // placeholder="Identity"
                                disabled={Boolean(registering)}
                                style={{
                                    textAlign: 'center',
                                    color: identityInputColor,
                                }}
                                autoFocus={true}
                                value={identity}
                            />
                            {loading ? (
                                <Loading
                                    className="spinner-border text-secondary"
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        marginLeft: '-23px',
                                    }}
                                />
                            ) : (
                                <span></span>
                            )}
                        </div>
                    </div>
                </div>
            </form>

            <form className="introduce-yourself-form introduce-yourself-form-below">
                <div
                    className="introduce-yourself-form-inside"
                    style={{ textAlign: 'center' }}
                >
                    {mode === 'default' ? (
                        <div>
                            <h5>Do you have a Twitter handle?</h5>
                            <Container>
                                <Row>
                                    <Col style={{ textAlign: 'center' }}>
                                        <div className="twitter-handle-yesno twitter-handle-yes">
                                            YES
                                        </div>
                                        <br />
                                        <p
                                            style={{ textAlign: 'left' }}
                                            className="text-medium"
                                        >
                                            <strong className="twitter-handle-subheading-yes">
                                                Claim your Twitter handle.
                                            </strong>
                                            <br />
                                            Until the end of 2023, Twitter users
                                            can claim their Twitter handles on
                                            web3, before they can be grabbed by
                                            cybersquatters.
                                        </p>
                                    </Col>
                                    <Col style={{ textAlign: 'center' }}>
                                        <div className="twitter-handle-yesno twitter-handle-no">
                                            NO
                                        </div>
                                        <br />
                                        <p
                                            style={{ textAlign: 'left' }}
                                            className="text-medium"
                                        >
                                            <strong className="twitter-handle-subheading-no">
                                                Type anything.
                                            </strong>
                                            <br />
                                            Take any handle that is not
                                            registered on Twitter or Point. Just
                                            start typing, we&apos;ll help you
                                            find one that is available.
                                        </p>
                                    </Col>
                                </Row>
                            </Container>
                        </div>
                    ) : (
                        <span></span>
                    )}

                    {mode === 'twitter' ? (
                        <div className="py-3">
                            <h3 className="mb-2">Twitter validation</h3>
                            <p>
                                Looks like{' '}
                                <span
                                    className="italic bold"
                                    style={{ color: 'aqua' }}
                                >
                                    @{identity}
                                </span>{' '}
                                is on Twitter. Is this you?
                            </p>

                            <Accordion>
                                <Accordion.Item eventKey="0">
                                    <Accordion.Header>
                                        Yes, this is me
                                    </Accordion.Header>
                                    <Accordion.Body>
                                        <p className="text-medium">
                                            Until the end of 2023, we are saving{' '}
                                            <strong style={{ color: 'cyan' }}>
                                                {identity}.point
                                            </strong>{' '}
                                            from cybersquatters, for you. To
                                            claim it on Point:
                                        </p>

                                        <p>
                                            <div className="tweet-bullet">
                                                1
                                            </div>
                                            Tweet the following message:
                                        </p>

                                        <div>
                                            <div
                                                style={{ position: 'relative' }}
                                            >
                                                <textarea
                                                    className="my-2 p-2 text-medium tweet-textarea"
                                                    rows="8"
                                                    cols="50"
                                                    value={tweetContent}
                                                    onChange={
                                                        onChangeTweetContentHandler
                                                    }
                                                    style={{
                                                        width: '100%',
                                                        fontSize: '0.9em',
                                                    }}
                                                />
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent:
                                                            'space-between',
                                                        position: 'absolute',
                                                        left: '0px',
                                                        bottom: '5px',
                                                        width: '96%',
                                                        margin: '0px 2%',
                                                    }}
                                                    className="my-2 py-2"
                                                >
                                                    {!isTweetContentUnchanged(
                                                        activationCode,
                                                        identity,
                                                    ) ? (
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
                                                    ) : (
                                                        <div></div>
                                                    )}

                                                    <div>
                                                        <div
                                                            className={
                                                                tweetSize >
                                                                MAX_TWEET_SIZE
                                                                    ? 'red bold text-medium'
                                                                    : 'text-medium'
                                                            }
                                                            style={{
                                                                flexShrink: 0,
                                                                float: 'left',
                                                                backgroundColor:
                                                                    '#383A3F',
                                                                padding: '5px',
                                                                color: '#aaa',
                                                                fontSize:
                                                                    '0.9em',
                                                            }}
                                                        >
                                                            {tweetSize}/
                                                            {MAX_TWEET_SIZE}
                                                        </div>

                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            style={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                            }}
                                                            type="button"
                                                            title="Copy Tweet content"
                                                            onClick={() =>
                                                                navigator.clipboard.writeText(
                                                                    tweetContent,
                                                                )
                                                            }
                                                            disabled={
                                                                tweetTooBig
                                                            }
                                                        >
                                                            <CopyIcon />
                                                            <span className="mx-2">
                                                                Copy
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {tweetContentError ? (
                                                <div
                                                    className="text-medium alert alert-danger"
                                                    style={{
                                                        paddingRight: '10px',
                                                        flex: 1,
                                                        lineBreak: 'anywhere',
                                                    }}
                                                >
                                                    {tweetContentError}
                                                </div>
                                            ) : (
                                                <span></span>
                                            )}

                                            <div
                                                style={{
                                                    // display: 'flex',
                                                    // justifyContent: 'space-between',
                                                    // alignItems: 'center',
                                                    textAlign: 'right',
                                                }}
                                                className="py-2"
                                            >
                                                <button
                                                    className="btn btn-primary btn-sm py-2 mx-2 btn-send-tweet"
                                                    onClick={
                                                        openTwitterWithMessage
                                                    }
                                                    type="button"
                                                    style={
                                                        {
                                                            // display: 'flex',
                                                            // alignItems: 'center',
                                                        }
                                                    }
                                                    disabled={
                                                        tweetTooBig ||
                                                        openingTwitter
                                                    }
                                                >
                                                    {openingTwitter ? (
                                                        <Loading
                                                            style={{
                                                                width: '10px',
                                                                height: '10px',
                                                                marginRight:
                                                                    '5px',
                                                            }}
                                                        />
                                                    ) : (
                                                        <TwitterIcon
                                                            className="text-large"
                                                            style={{
                                                                marginRight:
                                                                    '5px',
                                                            }}
                                                        />
                                                    )}
                                                    <span>Send the Tweet</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div
                                            className="input-group"
                                            style={{ width: '100%' }}
                                        >
                                            <p>
                                                <div className="tweet-bullet">
                                                    2
                                                </div>
                                                Paste the URL of your tweet
                                                below:
                                            </p>

                                            <input
                                                type="text"
                                                onChange={onChangeUrlHandler}
                                                placeholder={
                                                    'https://twitter.com/' +
                                                    identity +
                                                    '/status/...'
                                                }
                                                className="text-medium form-control"
                                                style={{ fontSize: '0.9em' }}
                                            />
                                            <div
                                                className="input-group-append"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {identity &&
                                                identityAvailable &&
                                                !error &&
                                                (!activationCode ||
                                                    (tweetUrl &&
                                                        !tweetUrlError)) ? (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                        }}
                                                    >
                                                        <button
                                                            className="btn btn-primary btn-check-tweet-or-register"
                                                            onClick={
                                                                registerHandler
                                                            }
                                                            type="button"
                                                            disabled={Boolean(
                                                                registering,
                                                            )}
                                                            style={{
                                                                marginBottom:
                                                                    '1em',
                                                                float: 'right',
                                                            }}
                                                        >
                                                            {activationCode
                                                                ? 'Check Tweet ▶'
                                                                : 'Register'}
                                                        </button>
                                                        {registering ? (
                                                            <div
                                                                className="spinner-border text-secondary"
                                                                role="status"
                                                                style={{
                                                                    width: '20px',
                                                                    height: '20px',
                                                                    marginLeft:
                                                                        '5px',
                                                                }}
                                                            ></div>
                                                        ) : (
                                                            <span></span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span></span>
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            {tweetUrlError ? (
                                                <div
                                                    className="alert alert-danger text-medium"
                                                    style={
                                                        {
                                                            // height: '35px',
                                                            // padding: '7px',
                                                        }
                                                    }
                                                >
                                                    {tweetUrlError}
                                                </div>
                                            ) : (
                                                <span></span>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div className="text-small alert alert-info">
                                                <strong>Note:</strong> Do not
                                                delete the tweet for at least 24
                                                hours, to prove that it was not
                                                someone briefly compromising the
                                                twitter account
                                            </div>
                                        </div>
                                    </Accordion.Body>
                                </Accordion.Item>
                                <Accordion.Item eventKey="1">
                                    <Accordion.Header>
                                        No, help me choose
                                    </Accordion.Header>
                                    <Accordion.Body>
                                        Can&apos;t find a good name that is not
                                        taken? Try these:
                                        {/* <br/>*/}
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                margin: '10px 0',
                                                background:
                                                    'rgba(0,255,255,0.1)',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            {suggestions.map((name) => {
                                                const availability =
                                                    suggestionsAvailability[
                                                        name
                                                    ] === 'free'
                                                        ? true
                                                        : !suggestionsAvailability[
                                                              name
                                                          ]
                                                        ? null
                                                        : false;
                                                const linkStyles = {
                                                    color:
                                                        availability === true
                                                            ? '#0f0'
                                                            : availability ===
                                                              false
                                                            ? 'rgb(238,90,90)'
                                                            : '#aaa',
                                                    textDecoration:
                                                        availability === true
                                                            ? 'underline'
                                                            : availability ===
                                                              false
                                                            ? 'none'
                                                            : 'none',
                                                };
                                                const click = (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (availability === true) {
                                                        // trigger
                                                        // setIdentity(name);
                                                        onChangeHandler({
                                                            target: {
                                                                value: name,
                                                            },
                                                        });
                                                        return false;
                                                    } else {
                                                        return false;
                                                    }
                                                    return false;
                                                };

                                                return (
                                                    <div
                                                        style={{
                                                            width: '50%',
                                                            padding: '4px',
                                                            paddingLeft: '1em',
                                                            textAlign: 'left',
                                                        }}
                                                        key={name}
                                                    >
                                                        <a
                                                            href={'/' + name}
                                                            onClick={click}
                                                            style={linkStyles}
                                                        >
                                                            @{name}
                                                        </a>
                                                        <div
                                                            style={{
                                                                float: 'right',
                                                            }}
                                                        >
                                                            {availability ===
                                                            true ? (
                                                                <span
                                                                    className="text-small"
                                                                    style={{
                                                                        color: '#0f0',
                                                                        width: '10px',
                                                                        marginRight:
                                                                            '5px',
                                                                        fontWeight:
                                                                            'bold',
                                                                    }}
                                                                >
                                                                    ✓
                                                                </span>
                                                            ) : availability ===
                                                              false ? (
                                                                <span
                                                                    className="text-small"
                                                                    style={{
                                                                        color: 'rgb(238,90,90)',
                                                                        width: '10px',
                                                                        marginRight:
                                                                            '5px',
                                                                        fontWeight:
                                                                            'bold',
                                                                    }}
                                                                >
                                                                    ✗
                                                                </span>
                                                            ) : (
                                                                // spinner
                                                                <span
                                                                    className="text-small"
                                                                    style={{
                                                                        color: '#0f0',
                                                                    }}
                                                                >
                                                                    <Loading
                                                                        style={{
                                                                            width: '10px',
                                                                            height: '10px',
                                                                            marginRight:
                                                                                '5px',
                                                                        }}
                                                                    />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <br />
                                        <div
                                            className="alert alert-info"
                                            style={{ textAlign: 'left' }}
                                        >
                                            Also note that if the owner of{' '}
                                            <strong>@{identity}</strong>{' '}
                                            doesn&apos;t claim it until the end
                                            of 2023, it will be available for
                                            you to take.
                                        </div>
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </div>
                    ) : (
                        <span></span>
                    )}

                    {mode === 'error' ? (
                        <div
                            className="text-medium alert alert-danger"
                            style={{ fontSize: '1em', margin: '-22px' }}
                        >
                            <ExclamationCircleFill
                                className="text-large"
                                style={{
                                    marginRight: '0.4em',
                                    position: 'relative',
                                    top: '-2px',
                                }}
                            />

                            {error}
                        </div>
                    ) : eligibility === 'free' ? (
                        <div
                            className="py-2 text-medium alert alert-success"
                            style={{ margin: '-21px', color: 'lime' }}
                        >
                            <div style={{ marginTop: '10px', color: 'lime' }}>
                                Great, this handle is available! You can claim
                                it right now.
                            </div>

                            {mode === 'continue' ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        justifyContent: 'center',
                                        margin: '30px',
                                    }}
                                >
                                    <button
                                        className="btn btn-success mt-2 btn-register-identity"
                                        onClick={registerHandler}
                                        disabled={Boolean(registering)}
                                        type="button"
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
                                        <span></span>
                                    )}
                                </div>
                            ) : (
                                <span></span>
                            )}
                        </div>
                    ) : (
                        <span></span>
                    )}
                </div>
            </form>
        </Container>
    );
};

export default Final;
