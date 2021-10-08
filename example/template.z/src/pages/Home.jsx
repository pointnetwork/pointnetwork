import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Popover from 'react-bootstrap/Popover'
import Button from 'react-bootstrap/Button'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import { Link } from "wouter";
import { useAppContext } from '../context/AppContext';
import Wallet from '../components/Wallet';

export default function Home() {
  const { walletAddress } = useAppContext();

  const popover = (
    <Popover id="popover-basic">
      <Popover.Header as="h3">Popover right</Popover.Header>
      <Popover.Body>
        And here's some <strong>amazing</strong> content. It's very engaging.
        right?
      </Popover.Body>
    </Popover>
  );

  return (
    <>
      <Container className="p-3">
        <h1 className="header">Welcome to the Point Network Template App!</h1>
        <Wallet walletAddress={walletAddress} />
        <Row>
          <Col>
            <h4>Column 1 of 3</h4>
            <Link to='/examples'><Button variant="primary" size="sm">Component Examples</Button></Link><br/>
            Click the above button to view some more examples of React Bootstrap components.<br/><br/>
          </Col>
          <Col>
            <h4>Column 2 of 3</h4>
            <Link to='/contracts'><Button variant="primary" size="sm">Contract Examples</Button></Link><br/>
            Click the above button to view some examples of calling Smart Contract functions.<br/><br/>
          </Col>
          <Col>
            <h4>Column 3 of 3</h4>
            <OverlayTrigger trigger="click" placement="primary" overlay={popover}>
              <Button variant="primary" size="sm">Popover Example</Button>
            </OverlayTrigger><br/>
            Click the above button to view an example of a popover component.<br/><br/>
          </Col>
        </Row>
      </Container>
    </>
  );
}
