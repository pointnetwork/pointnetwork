import { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Loading from '../components/Loading';
import appLogo from '../assets/pointlogo.png';
import blogIcon from '../assets/blog.svg';
import emailIcon from '../assets/email.svg';
import socialIcon from '../assets/social.svg';
import driveIcon from '../assets/drive.svg';
import walletIcon from '../assets/wallet.svg';
import '@fontsource/source-sans-pro';
import { Link } from 'react-router-dom';

export default function Home() {
    const [zapps, setZapps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const featuredZapps = {
        'social.point': 'Social',
        'email.point': 'Email',
        'drive.point': 'Drive',
    };

    const featuredIcons = {
        'social.point': socialIcon,
        'email.point': emailIcon,
        'drive.point': driveIcon,
    };

    useEffect(() => {
        fetchZappsDeployed();
    }, []);

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
            <a
                href={'https://' + k}
                target="_blank"
                rel="noreferrer"
                className="zapp"
                key={k}
            >
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

                <div className="zapp-information-container">
                    <h4>{featuredZapps[k]}</h4>
                    <span>https://{k}</span>
                </div>
            </a>
        );
    };

    const internalEntries = (
        <>
            <a
                href={'https://point/wallet'}
                target="_blank"
                rel="noreferrer"
                className="zapp"
            >
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

                <div className="zapp-information-container">
                    <h4>Wallet</h4>
                    <span>https://point/wallet</span>
                </div>
            </a>
            <Link
                to="/deploy_blog"
                target="_blank"
                rel="noreferrer"
                className="zapp"
            >
                <div className="zapp-icon-container">
                    <img
                        alt="deploy_blog"
                        className="zapp-icon"
                        src={blogIcon}
                        onError={({ currentTarget }) => {
                            currentTarget.src = appLogo;
                        }}
                    />
                </div>

                <div className="zapp-information-container">
                    <h4>Make your blog</h4>
                </div>
            </Link>
        </>
    );

    let zappsList = <div className="zapps">{internalEntries}</div>;

    if (zapps.length > 0) {
        zappsList = (
            <div className="zapps">
                {[internalEntries, zapps.map((k) => renderZappEntry(k))]}
            </div>
        );
    }

    return (
        <Container className="home-container">
            <h1 className="home-header">
                Welcome to <span>Web 3.0</span>
            </h1>

            <h3 className="home-subtitle">Explore featured Apps</h3>
            <hr className="zapps-separator" />

            {isLoading ? (
                <Loading
                    style={{
                        display: 'block',
                        margin: '0 auto',
                    }}
                />
            ) : (
                zappsList
            )}
        </Container>
    );
}
