/* eslint-disable no-case-declarations */
/* eslint-disable no-console */
import React, { useState } from 'react';
import { Link } from 'wouter';
import axios from 'axios';

const FASTIFY_PORT = 3003;
const EXPRESS_PORT = 3004;

const UploadLocalServer = () => {
    const [client, setClient] = useState('fetch');
    const [backend, setBackend] = useState('fastify');
    const [asBlob, setAsBlob] = useState(false);
    const [cover, setCover] = useState(null);
    const [blob, setBlob] = useState(null);

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
        const port = backend === 'express' ? EXPRESS_PORT : FASTIFY_PORT;
        const url = `http://localhost:${port}/point`;

        const form = new FormData();
        if (asBlob) {
            console.log('Appending file as `blob`');
            form.append('file', blob);
        } else {
            console.log('Appending file as `file`');
            form.append('file', cover);
        }

        try {
            let hash = '';
            switch (client) {
                case 'axios':
                    console.log('Making POST request with axios');
                    const axiosResp = await axios({
                        method: 'POST',
                        url,
                        data: form,
                    });
                    hash = axiosResp.data?.hash;
                    break;
                case 'fetch':
                    console.log('Making POST request with fetch');
                    const fetchResp = await fetch(url, {
                        method: 'POST',
                        body: form,
                    });
                    const fetchData = await fetchResp.json();
                    hash = fetchData.hash;
                    break;
                default:
                    throw new Error(`Invalid HTTP Client: ${client}`);
            }

            alert(`Successfully uploaded image: ${hash}`);
            console.log(hash);
        } catch (err) {
            console.error(err);
            alert('Error in console');
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
            <h4>Upload File To Local Server</h4>
            <p>You need to have local express and fastify servers running.</p>
            <p>
                If you want to upload directly, without using local servers, go{' '}
                <Link to="/upload_test">here</Link> instead.
            </p>

            <div style={{ marginBottom: 40 }}>
                <select
                    style={{ marginRight: 4 }}
                    name="client"
                    id="client"
                    defaultValue="fetch"
                    onChange={(ev) => setClient(ev.target.value)}
                >
                    <option value="fetch">Fetch</option>
                    <option value="axios">Axios</option>
                </select>
                <select
                    style={{ marginRight: 4 }}
                    name="backend"
                    id="backend"
                    defaultValue="fastify"
                    onChange={(ev) => setBackend(ev.target.value)}
                >
                    <option value="fastify">Fastify</option>
                    <option value="express">Express</option>
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

export default UploadLocalServer;
