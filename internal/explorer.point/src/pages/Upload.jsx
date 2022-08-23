/* eslint-disable no-case-declarations */
/* eslint-disable no-console */
import React, { useState } from 'react';
import axios from 'axios';

const Upload = () => {
    const [client, setClient] = useState('pointsdk');
    const [cover, setCover] = useState(null);
    const [blob, setBlob] = useState(null);
    const [asBlob, setAsBlob] = useState(false);

    function DataURIToBlob(dataURI) {
        const splitDataURI = dataURI.split(',');
        const byteString =
            splitDataURI[0].indexOf('base64') >= 0
                ? atob(splitDataURI[1])
                : decodeURI(splitDataURI[1]);

        const mimeString = splitDataURI[0].split(':')[1].split(';')[0];

        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++)
            ia[i] = byteString.charCodeAt(i);

        return new Blob([ia], { type: mimeString });
    }

    const handleFileInput = (e) => {
        const file = e.target.files ? e.target.files[0] : null;
        setCover(file);

        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = (ev) => {
            const data = ev.srcElement.result;
            setBlob(DataURIToBlob(data));
        };
    };

    const upload = async () => {
        const form = new FormData();
        if (asBlob) {
            console.log('Appending file as `blob`');
            form.append('files', blob);
        } else {
            console.log('Appending file as `file`');
            form.append('files', cover);
        }

        // POST the form with the corresponding client.
        try {
            let hash = '';
            switch (client) {
                case 'pointsdk':
                    console.log('Making POST request via Point SDK');
                    const pointResp = await window.point.storage.postFile(form);
                    hash = pointResp.data;
                    break;
                case 'axios':
                    console.log('Making POST request with axios');
                    const axiosResp = await axios({
                        method: 'POST',
                        url: 'https://point/_storage',
                        data: form,
                    });
                    hash = axiosResp.data?.data;
                    break;
                case 'fetch':
                    console.log('Making POST request with fetch');
                    const fetchResp = await fetch('https://point/_storage', {
                        method: 'POST',
                        body: form,
                    });
                    const fetchData = await fetchResp.json();
                    hash = fetchData.data;
                    break;
                default:
                    throw new Error(`Invalid HTTP Client: ${client}`);
            }

            alert(`Successfully uploaded image: ${hash}`);
            console.log(hash);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <main
            style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 'calc(100vh - 40px)',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <h4>Upload File</h4>
            <div style={{ marginBottom: 40 }}>
                <select
                    style={{ marginRight: 4 }}
                    name="client"
                    id="client"
                    defaultValue="pointsdk"
                    onChange={(ev) => setClient(ev.target.value)}
                >
                    <option value="pointsdk">Point SDK</option>
                    <option value="fetch">Fetch</option>
                    <option value="axios">Axios</option>
                </select>
                <select
                    name="blob"
                    id="blob"
                    defaultValue="false"
                    onChange={(ev) =>
                        setAsBlob(ev.target.value === 'false' ? false : true)
                    }
                >
                    <option value="false">Use regular form file</option>
                    <option value="true">Convert file to blob</option>
                </select>
            </div>

            <div
                style={{
                    border: '1px solid black',
                    margin: '40px 0',
                    padding: 40,
                }}
            >
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                />
            </div>

            <button type="button" onClick={upload}>
                Upload File
            </button>
        </main>
    );
};

export default Upload;
