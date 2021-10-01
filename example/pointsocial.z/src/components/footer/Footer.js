import './footer.css'
import { Link } from "wouter";

export default Footer = () => (
    <footer id="footer">
      <section className="footerContainer">
        <Link to="/">
          <span>&copy; 2021 Point Social</span>
        </Link>
      </section>
    </footer>
  )