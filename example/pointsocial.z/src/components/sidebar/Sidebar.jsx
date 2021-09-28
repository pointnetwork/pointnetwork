import "./sidebar.css";
import {
  RssFeed,
} from "@material-ui/icons";
import { Link } from "wouter";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebarWrapper">
        <ul className="sidebarList">
          <li className="sidebarListItem">
            <RssFeed className="sidebarIcon" />
            <Link to='/'>
              <span className="sidebarListItemText">Feed</span>
            </Link>
          </li>
        </ul>
        <hr className="sidebarHr" />
      </div>
    </div>
  );
}
