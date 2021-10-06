import Topbar from "../../components/topbar/Topbar";
import Footer from "../../components/footer/Footer";
import "./home.css"

export default function Home() {
  return (
    <>
      <Topbar />
        <div className="homeContainer">
          <h1>Work your magic here...!</h1>
        </div>
      <Footer />
    </>
  );
}
