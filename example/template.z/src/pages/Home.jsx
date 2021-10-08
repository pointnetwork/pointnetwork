import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

export default function Home() {
  const lorum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc viverra tellus rutrum aliquam condimentum. Ut dapibus magna nisl, dignissim pellentesque massa eleifend at. Suspendisse id tempus nulla, et euismod mi. Mauris mollis lacinia lorem. Ut vulputate, elit sit amet laoreet luctus, turpis velit efficitur turpis, a molestie ligula dolor non velit. Donec eget scelerisque libero, vitae varius purus. Vestibulum vulputate metus nisl, et luctus augue lacinia ac. Nam ligula quam, interdum nec turpis quis, gravida tempus odio. Sed a congue diam. Integer eu augue a tellus feugiat venenatis vel a lectus. Maecenas et scelerisque purus.'

  return (
    <>
      <Container className="p-3">
        <h1 className="header">Welcome to Template App!</h1>
        <p>This template is a responsive 3 column layout with fixed header and footer.</p>
        <Row>
          <Col>Col 1 of 2: {lorum}</Col>
          <Col>Col 2 of 2: {lorum}</Col>
          <Col>Col 3 of 3: {lorum}</Col>
        </Row>
      </Container>
    </>
  );
}
