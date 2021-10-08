import { useState } from 'react';
import Toast from 'react-bootstrap/Toast';
import Button from 'react-bootstrap/Button';

const ExampleToast = ({children}) => {
    const [show, toggleShow] = useState(true);

    return (
        <>
            {!show && <Button onClick={() => toggleShow(true)}>Show Toast</Button>}
            <Toast show={show} onClose={() => toggleShow(false)}>
                <Toast.Header>
                <strong className="mr-auto">React-Bootstrap</strong>
                </Toast.Header>
                <Toast.Body>{children}</Toast.Body>
            </Toast>
        </>
    );
}

export default ExampleToast
