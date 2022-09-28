import { useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const DEFAULT_ERROR_MESSAGE = 'Something went wrong';
export const MAX_TWEET_SIZE = 280;

const useFinal = () => {
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
        debounced.current = setTimeout(async () => {
            setError('');
            setLoading(true);
            axios
                .get(`/v1/api/identity/isIdentityEligible/${identity}`, {
                    cancelToken: new axios.CancelToken((c) => {
                        cancelRef.current = c;
                    }),
                    headers: {
                        'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
                    },
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
                headers: {
                    'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
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
                Swal.fire({
                    icon: 'error',
                    text: reason || DEFAULT_ERROR_MESSAGE,
                });
                return;
            }
            window.location = '/';
        } catch (error) {
            setRegistering(false);
            Swal.fire({
                title: DEFAULT_ERROR_MESSAGE,
                text: 'Error: ' + error.message,
            });
        }
    };

    async function openTwitterWithMessage() {
        setOpeningTwitter(true);
        try {
            await axios({
                url: '/v1/api/identity/open',
                method: 'POST',
                data: {
                    url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        tweetContent,
                    )}`,
                    _csrf: window.localStorage.getItem('csrf_token'),
                },
                headers: {
                    'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
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

    return {
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
    };
};

export default useFinal;
