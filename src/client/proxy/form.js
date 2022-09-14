/* eslint-disable no-console */
window.addEventListener('DOMContentLoaded', () => {
    /**
     * Usage:
     * • Run Point Engine
     * • Open Point Browser or a browser configured to use HTTPS proxy at localhost:8666
     * • Load https://point
     * • Open browser console
     * • Copy and paste the contents of this file into the console prompt and hit enter
     * • The web page contents will be replaced with the HTML generated below
     * • Choose a file to upload
     * • Choose whether or not to use Point SDK (requires SDK installation)
     * • Choose upload method – the problematic one is "Upload Form"
     */
    const input = document.createElement('input');
    input.type = input.name = 'file';
    input.accept = 'image/gif,image/png,image/jpeg,image/bmp,' +
        'image/webp,video/webm,video/ogg,video/mp4,video/mpeg';

    const preview = document.createElement('img');
    preview.style = 'height: 250px; width: auto;';
    preview.alt = 'Image preview';

    input.onchange = () => {
        preview.src = input.files.length ? URL.createObjectURL(input.files[0]) : '';
    };

    const checkbox = document.createElement('input');
    const label = document.createElement('label');

    checkbox.type = checkbox.id = label.for = 'checkbox';
    checkbox.name = 'sdk';
    checkbox.checked = typeof window.point === 'object';
    checkbox.disabled = window.point === undefined;
    label.innerHTML = 'Use SDK';

    const uploadForm = document.createElement('button');
    const uploadBlob = document.createElement('button');

    uploadForm.innerHTML = 'Upload Form';
    uploadBlob.innerHTML = 'Upload Blob';

    const uploadWithTimeout = (body, length = undefined) => {
        console.log({length});
        const upload = () => fetch('/', {
            method: 'POST',
            keepalive: true,
            mode: 'cors',
            headers: length ? {
                'Connection': 'Keep-Alive',
                'Content-Length': length
            } : {keepalive: true},
            body
        }).then((res) => {
            if (!res.ok) {
                throw `Server error: [${resp.status}] [${resp.statusText}] [${resp.url}]`;
            }
            return res.json();
        }).catch((error) => console.error('Fetch error:', error));
        
        return Promise.race([upload(), new Promise((_, reject) => setTimeout(() => reject(
            new Error('Timeout error')
        ), 10_000))]);
    };

    uploadForm.onclick = async () => {
        if (!input.files.length) {
            alert('Please select a file to upload');
            return;
        }

        const body = new FormData();

        body.append('file', input.files[0]);

        try {
            console.info('Uploading from data', body);
            const {data: hash} = await uploadWithTimeout(body, input.files[0].size);
            console.log('Successfully uploaded data at', hash);
        } catch (e) {
            console.error('Failed to upload form data', body, e);
        }
    };

    uploadBlob.onclick = async () => {
        if (!input.files.length) {
            alert('Please select a file to upload');
            return;
        }

        const DataURIToBlob = (dataURI) => {
            const splitDataURI = dataURI.split(',');
            const byteString = splitDataURI[0].indexOf('base64') >= 0
                ? atob(splitDataURI[1])
                : decodeURI(splitDataURI[1]);

            const mimeString = splitDataURI[0].split(':')[1].split(';')[0];
            const ia = new Uint8Array(byteString.length);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            return new Blob([ia], {type: mimeString});
        };

        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(input.files[0]);
            reader.onload = e => resolve(e.srcElement.result);
            reader.onerror = reject;
        });

        const body = new FormData();
        const blob = DataURIToBlob(data);

        body.append('file', blob);

        try {
            console.log('Uploading blob:', {body, blob});
            const {data: hash} = await uploadWithTimeout(body);
            console.log('Successfully uploaded blob at', hash);
        } catch (e) {
            console.error('Failed to upload blob', body, e);
        }
    };

    const container = document.createElement('div');
    const imgContainer = document.createElement('div');
    const cbContainer = document.createElement('div');

    cbContainer.append(checkbox, label);
    imgContainer.appendChild(preview);
    container.append(input, cbContainer, uploadForm, uploadBlob, imgContainer);

    document.body.innerHTML = '';
    document.body.appendChild(container);
});
