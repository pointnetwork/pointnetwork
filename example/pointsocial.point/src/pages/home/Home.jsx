import Topbar from "../../components/topbar/Topbar";
import Footer from "../../components/footer/Footer";
import Sidebar from "../../components/sidebar/Sidebar";
import Feed from "../../components/feed/Feed";
import Rightbar from "../../components/rightbar/Rightbar";
import "./home.css"

export default function Home() {
  return (
    <>
      <Topbar />
      <div className="homeContainer">
        <Sidebar />
        <Feed/>
        <Rightbar/>
      </div>
      <Footer />
    </>
  );
}
