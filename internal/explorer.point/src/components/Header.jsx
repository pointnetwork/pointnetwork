import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import logo from '../assets/pointlogowhite.png';
import { LinkContainer } from 'react-router-bootstrap';
import { useAppContext } from '../context/AppContext';

const Header = ({ isRegistered }) => {
    const { walletIdentity } = useAppContext();

    return (
        <>
            <Navbar collapseOnSelect expand="lg" bg="dark" variant="dark">
                <Container>
                    <img src={logo} className="imgLogo" alt="Point Network" />
                    <LinkContainer to="/">
                        <Navbar.Brand href="/point">Point Network</Navbar.Brand>
                    </LinkContainer>
                    <Navbar.Toggle aria-controls="responsive-navbar-nav" />

                    <Navbar.Collapse id="responsive-navbar-nav">
                        <Nav className="me-auto">
                            {isRegistered ? (
                                <>
                                    <LinkContainer to="/wallet">
                                        <Nav.Link href="/wallet">
                                            Wallet
                                        </Nav.Link>
                                    </LinkContainer>
                                    <LinkContainer to="/zapps">
                                        <Nav.Link href="/zapps">Apps</Nav.Link>
                                    </LinkContainer>
                                    <LinkContainer to="/identities">
                                        <Nav.Link href="/identities">
                                            Identities
                                        </Nav.Link>
                                    </LinkContainer>
                                    <LinkContainer to="/myidentities">
                                        <Nav.Link href="/myidentities">
                                            My Identities
                                        </Nav.Link>
                                    </LinkContainer>
                                    <LinkContainer
                                        to={'/identities/' + walletIdentity}
                                    >
                                        <Nav.Link
                                            href={
                                                '/identities/' + walletIdentity
                                            }
                                        >
                                            @{walletIdentity}
                                        </Nav.Link>
                                    </LinkContainer>
                                </>
                            ) : (
                                ''
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </>
    );
};

export default Header;
