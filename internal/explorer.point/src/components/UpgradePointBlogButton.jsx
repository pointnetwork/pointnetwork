import axios from 'axios';
import { useState, useEffect } from 'react';

export const LAST_BLOG_VERSION =
    '84708e41326d1d918aeff47be062e3b5d9d6e9e2b53b0e8e4402f099e6e08f05';

export const KNOWN_BLOG_ROOT_DIR_HASHES = [
    // here we need to put known abi hashes
    '84708e41326d1d918aeff47be062e3b5d9d6e9e2b53b0e8e4402f099e6e08f05',
    '6ce5c3f525128f4173cd4931870b28d05280d66bd206826be1f23242d05c94bb',
    '62b7abab7403738d4012a165a77d8b67fa73b61a8e9a9a93d791f4a75ac4471b',
    '00f4b6c161016d0adf1bd89ebd43c670ad69288bb3cf3d9407db018dde3c69df',
    'c4226811df9ef1f97080b6b9d1af107a9795389d8e71beb18717b3b5d6edc1d9',
    '10c0366c3bb407a0448f8d1f3c88b4f6f4865e2827c0611e871f3348a8848a6c',
];

const UpgradePointBlogButton = ({ subidentity }) => {
    const [isBlog, setIsBlog] = useState(false);
    const [isUpToDate, setIsUpToDate] = useState(false);
    useEffect(() => {
        async function fetchPointBlog() {
            const rootDir = await window.point.contract.call({
                contract: 'Identity',
                method: 'ikvGet',
                params: [subidentity, '::rootDir'],
            });
            if (
                rootDir.data &&
                KNOWN_BLOG_ROOT_DIR_HASHES.includes(rootDir.data)
            ) {
                setIsBlog(true);
                if (rootDir.data === LAST_BLOG_VERSION) {
                    setIsUpToDate(true);
                }
            }
        }
        fetchPointBlog();
    }, []);

    return (
        isBlog &&
        (isUpToDate ? (
            <button
                className="btn btn-primary btn-sm"
                style={{ marginLeft: 8, padding: '2px 4px', fontSize: '12px' }}
                disabled={true}
            >
                Your Blog is up to date
            </button>
        ) : (
            <button
                className="btn btn-primary btn-sm"
                style={{ marginLeft: 8, padding: '2px 4px', fontSize: '12px' }}
                onClick={async () => {
                    await axios.post(
                        '/point_api/deploy_blog',
                        { subidentity },
                        {
                            headers: {
                                'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
                            },
                        },
                    );
                }}
            >
                Upgrade Blog
            </button>
        ))
    );
};

export default UpgradePointBlogButton;
