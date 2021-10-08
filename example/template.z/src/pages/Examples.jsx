import ExampleToast from '../components/ExampleToast';
import Container from 'react-bootstrap/Container';

export default function Examples() {
  return (
    <>
        <Container className="p-3">
            <h1 className="header">Example React-Bootstrap Components</h1>
            <ExampleToast>
                We now have Toasts
                <span role="img" aria-label="tada">
                    🎉
                </span>
            </ExampleToast>
        </Container>
    </>
  );
}
