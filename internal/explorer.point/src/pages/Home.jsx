import { useState, useEffect } from 'react';
// import Container from 'react-bootstrap/Container';
// import Loading from '../components/Loading';
import appLogo from '../assets/pointlogo.png';
import blogIcon from '../assets/blog.svg';
import emailIcon from '../assets/email.svg';
import socialIcon from '../assets/social.svg';
import driveIcon from '../assets/drive.svg';
import tubeIcon from '../assets/tube.svg';
// import transcendIcon from '../assets/transcend.svg';
import walletIcon from '../assets/wallet.svg';
import '@fontsource/source-sans-pro';
// import { Link } from 'react-router-dom';

// import css
import './Home.scss';

const FEATURED_ZAPPS = {
    'social.point': 'Social',
    'email.point': 'Email',
    'drive.point': 'Drive',
    'tube.point': 'Tube',
    // 'chat.point': 'Chat',
    // 'transcend.point': 'Transcend',
    'point/wallet': 'Wallet',
    'point/deploy_blog': 'Create Blog',
};

const FEATURED_ICONS = {
    'social.point': socialIcon,
    'email.point': emailIcon,
    'drive.point': driveIcon,
    'tube.point': tubeIcon,
    // 'transcend.point': transcendIcon,
    'point/wallet': walletIcon,
    'point/deploy_blog': blogIcon,
};

export default function Home() {
    const [zapps, setZapps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    void isLoading;

    useEffect(() => {
        fetchZappsDeployed();
    }, []);

    const fetchZappsDeployed = async () => {
        setIsLoading(true);
        const zappsDeployed = [];
        for (const k in FEATURED_ZAPPS) {
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
                className="disabled-zapp lia item"
                key={k}
            >
                <div className="disabled-zapp-icon-container">
                    <img
                        alt={k}
                        className="zapp-icon"
                        src={FEATURED_ICONS[k] || appLogo}
                        onError={({ currentTarget }) => {
                            currentTarget.src = appLogo;
                        }}
                    />
                </div>

                <div className="zapp-information-container">
                    <strong>{FEATURED_ZAPPS[k]}</strong>
                    {/* <span>https://{k}</span>*/}
                    <span>{k}</span>
                </div>
            </a>
        );
    };

    const internalEntries = [
        renderZappEntry('point/wallet'),
        renderZappEntry('point/deploy_blog'),
        renderZappEntry('social.point'),
        renderZappEntry('email.point'),
        renderZappEntry('drive.point'),
        renderZappEntry('tube.point'),
        // renderZappEntry('chat.point'),
        // renderZappEntry('transcend.point'),
    ];
    //     (
    //     <>
    //         <a
    //             href={'https://point/wallet'}
    //             target="_blank"
    //             rel="noreferrer"
    //             className="zapp"
    //         >
    //             <div className="zapp-icon-container">
    //                 <img
    //                     alt="wallet"
    //                     className="zapp-icon"
    //                     src={walletIcon}
    //                     onError={({ currentTarget }) => {
    //                         currentTarget.src = appLogo;
    //                     }}
    //                 />
    //             </div>
    //
    //             <div className="zapp-information-container">
    //                 <h4>Wallet</h4>
    //                 <span>https://point/wallet</span>
    //             </div>
    //         </a>
    //         <Link
    //             to="/deploy_blog"
    //             target="_blank"
    //             rel="noreferrer"
    //             className="zapp"
    //         >
    //             <div className="zapp-icon-container">
    //                 <img
    //                     alt="deploy_blog"
    //                     className="zapp-icon"
    //                     src={blogIcon}
    //                     onError={({ currentTarget }) => {
    //                         currentTarget.src = appLogo;
    //                     }}
    //                 />
    //             </div>
    //
    //             <div className="zapp-information-container">
    //                 <h4>Make your blog</h4>
    //             </div>
    //         </Link>
    //     </>
    // );

    // let zappsList = <div className="zapps">{internalEntries}</div>;
    let zappsList = internalEntries;

    if (zapps.length > 0) {
        zappsList =
            // <div className="zapps">
            [internalEntries]; // , zapps.map((k) => renderZappEntry(k))]
        // </div>
    }

    return (
        <div className="space-outer-container">
            <div className="space-container">
                <div className="container-fill"></div>
                <div className="container-landscape"></div>
                {/* <img
                    // src="/assets/space/space-left.png"
                    className="space space-left"
                    alt="Space"
                />
                <img
                    // src="/assets/space/space-right.png"
                    className="space space-right"
                    alt="Space"
                /> */}
                <main>
                    <h1 className="welcome home-header gradient-shadow">
                        <div>
                            Welcome to <span>Web 3.0</span>!
                        </div>
                    </h1>

                    <div className="featured">
                        <h4 className="">Explore featured Point dApps</h4>
                        <div className="featured-dapps">{zappsList}</div>
                    </div>
                </main>
            </div>
        </div>

        /*
        <Container className="home-container">
            {/!* <LinkPointToSol /> *!/}

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
*/
    );
}
