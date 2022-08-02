import Container from 'react-bootstrap/Container';
import "@fontsource/barlow";

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Loading from '../components/Loading';
import appLogo from '../assets/pointlogo.png';
import bountyLogo from '../assets/pointcoin.png';
import whiteLogo from '../assets/pointlogo.svg';
import walletIcon from '../assets/wallet.svg';
import socialIcon from '../assets/social.svg';
import emailIcon from '../assets/email.svg';
import blogIcon from '../assets/blog.svg';

import Markdown from 'markdown-to-jsx';

export default function Home() {
    const { walletIdentity } = useAppContext();
    const [zapps, setZapps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMD, setIsLoadingMD] = useState(true);
    const [markdown, setMarkdown] = useState('');

    const featuredZapps = {
        'social.point': 'Social',
        'email.point': 'Email',
        'blog.point': 'Blog',
    };

    const featuredIcons = {
        'social.point': socialIcon,
        'email.point': emailIcon,
        'blog.point': blogIcon,
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
            <a href={'https://' + k} target="_blank" rel="noreferrer" className="zapp-link">
                <div className="zapp" key={k}>
                    <div className="zapp-icon-container">
                        <img
                            alt={k}
                            className="zapp-icon"
                            src={featuredIcons[k]}
                            onError={({ currentTarget }) => {
                                currentTarget.src = appLogo;
                            }}
                        />
                    </div>
                    <div className="zapp-title-container">
                        <span>{featuredZapps[k]}</span>
                    </div>
                </div>
            </a>
        );
    };

    const renderWalletEntry = (
        <a href={'https://point/wallet'} target="_blank" rel="noreferrer" className="zapp-link">
            <div className="zapp">
                <div className="zapp-icon-container">
                    <img
                        alt="wallet"
                        className="zapp-icon"
                        src={walletIcon}
                        onError={({ currentTarget }) => {
                            currentTarget.src = appLogo;
                        }}
                    />
                </div>
                <div className="zapp-title-container">
                    <span>Wallet</span>
                </div>
            </div>
        </a>
    );

    let zappsList = <div className="zapps">
        <hr className="home-apps-separator"></hr>
        <div className="zapps-list">
            {renderWalletEntry}        
        </div>
        <hr className="home-apps-separator"></hr>
    </div>;

    if (zapps.length > 0) {
        zappsList = (
        <div className="zapps">
            <hr className="home-apps-separator"></hr>
            <div className="zapps-list">
                    {[renderWalletEntry, zapps.map((k) => renderZappEntry(k))]}
            </div>
            <hr className="home-apps-separator"></hr>
        </div>
        );
    }

    return (
        <div className="home-container">
            <h1 className="home-header">Welcome to Web 3.0</h1>
            <h5 className="home-header-2">Explore featured Apps</h5>
            <img src={whiteLogo} className="home-logo"/>
            {isLoading ? <Loading /> : zappsList}

            <div
                className="bounty-banner"
                onClick={() =>
                    window.open(
                        'https://point/web2redirect?url=' +
                            encodeURI('https://bounty.pointnetwork.io/') +
                            '&csrfToken=' +
                            window.localStorage.getItem('csrf_token'),
                    )
                }
            >

                <div className="bounty-banner-inner">
                    <div className="bounty-banner-header">
                        <img alt="bounty" src={whiteLogo} />
                        <h2>Point Bounty Program</h2>
                        <div className="bounty-banner-enter"><span>Enter</span></div>
                    </div>
                </div>

            </div>

        </div>
    );
}
