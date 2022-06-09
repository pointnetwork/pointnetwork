import Container from 'react-bootstrap/Container';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Loading from '../components/Loading';
import appLogo from '../assets/pointlogo.png';
import bountyLogo from '../assets/pointcoin.png';
import Markdown from 'markdown-to-jsx';

export default function Home() {
    const { walletIdentity } = useAppContext();
    const [zapps, setZapps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMD, setIsLoadingMD] = useState(true);
    const [markdown, setMarkdown] = useState('');

    const featuredZapps = {
        'blog.point': 'Blog',
        'social.point': 'Point Social',
        'email.point': 'Email',
    };

    useEffect(() => {
        fetchZappsDeployed();
        fetchMarkdown();
    }, []);

    const fetchMarkdown = async () => {
        setIsLoadingMD(true);
        try {
            const id = await window.point.contract.call({
                contract: 'Identity',
                method: 'ikvGet',
                params: ['explorer', 'markdown/index'],
            });
            const markdownData = await window.point.storage.getString({
                id: id.data,
                encoding: 'utf-8',
            });
            setMarkdown(markdownData.data);
        } catch (e) {
            setMarkdown('');
        }
        setIsLoadingMD(false);
    };

    const fetchZappsDeployed = async () => {
        setIsLoading(true);
        const zappsDeployed = [];
        for (const k in featuredZapps) {
            const zappRoutes = await window.point.contract.call({
                contract: 'Identity',
                method: 'ikvGet',
                params: [k.replace('.point', ''), 'zdns/routes'],
            });
            if (zappRoutes.data !== '') {
                zappsDeployed.push(k);
            }
        }
        setZapps(zappsDeployed);
        setIsLoading(false);
    };

    const renderZappEntry = (k) => {
        return (
            <a href={'https://' + k} target="_blank" rel="noreferrer">
                <div className="zapp" key={k}>
                    <div className="zapp-icon-container">
                        <img
                            alt={k}
                            className="zapp-icon"
                            src={`https://${k}/favicon.ico`}
                            onError={({ currentTarget }) => {
                                currentTarget.src = appLogo;
                            }}
                        />
                    </div>
                    <div className="zapp-title-container">
                        <span>{featuredZapps[k]}</span>
                    </div>
                    <div className="zapp-title-container">
                        <span className="text-muted text-smallest">
                            https://{k}
                        </span>
                    </div>
                </div>
            </a>
        );
    };

    const renderWalletEntry = (
        <a href={'https://point/wallet'} target="_blank" rel="noreferrer">
            <div className="zapp">
                <div className="zapp-icon-container">
                    <img
                        alt="wallet"
                        className="zapp-icon"
                        src={'https://point/wallet.ico'}
                        onError={({ currentTarget }) => {
                            currentTarget.src = appLogo;
                        }}
                    />
                </div>
                <div className="zapp-title-container">
                    <span>Wallet</span>
                </div>
                <div className="zapp-title-container">
                    <span className="text-muted text-smallest">
                        https://point/wallet
                    </span>
                </div>
            </div>
        </a>
    );

    let zappsList = <div className="zapps">{renderWalletEntry}</div>;
    if (zapps.length > 0) {
        zappsList = (
            <div className="zapps">
                {[renderWalletEntry, zapps.map((k) => renderZappEntry(k))]}
            </div>
        );
    }

    return (
        <>
            <Container className="p-3">
                <br />
                <br />
                <h1 className="header">
                    Welcome to Web 3.0,{' '}
                    <strong>
                        @{!walletIdentity ? <Loading /> : walletIdentity}
                    </strong>
                    !
                </h1>

                {isLoadingMD ? <Loading /> : <Markdown>{markdown}</Markdown>}

                <h5>Explore featured Apps</h5>
                {isLoading ? <Loading /> : zappsList}

                <div
                    className="bounty-banner"
                    onClick={() =>
                        window.open('https://point/web2redirect?url=' + encodeURI('https://bounty.pointnetwork.io/')
                        + '&csrfToken=' + window.localStorage.getItem("csrf_token"))
                    }
                >
                    <div className="bounty-banner-inner">
                        <div className="bounty-banner-header">
                            <img alt="bounty" src={bountyLogo} />
                            <h2>
                                Point <span>Bounty Program</span>
                            </h2>
                        </div>
                    </div>
                </div>
            </Container>
        </>
    );
}
