import { Store } from "./store/Store";
import { CataloguePage } from "./pages/CataloguePage";
import { Home } from "./pages/Home";
import { MarketPlace } from "./pages/MarketPlace";
import { MyKitties } from "./pages/MyKitties";
import { Factory } from "./pages/Factory";
import { KittyDetail } from "./pages/KittyDetail";
import { OthersKitties } from "./pages/OthersKitties";
import { Error404 } from "./pages/Error404";

export interface Route {
  navigationLabel?: string;
  to: string;
  isAllowed: boolean;
  component: React.ComponentType;
}

export const routes = (store: Store): Route[] => [
  {
    to: "/",
    isAllowed: true,
    component: Home,
  },
  {
    navigationLabel: "Catalogue",
    to: "/catalogue",
    isAllowed: true,
    component: CataloguePage,
  },
  {
    navigationLabel: "For sale",
    to: "/market",
    isAllowed: true,
    component: MarketPlace,
  },
  {
    navigationLabel: "My kitties",
    to: "/my-kitties",
    isAllowed: !!store.account,
    component: MyKitties,
  },
  {
    navigationLabel: "Factory",
    to: "/factory",
    isAllowed: !!store.isOwner,
    component: Factory,
  },
  {
    to: "/kitty/:id",
    isAllowed: true,
    component: KittyDetail,
  },
  {
    to: "/profile/:address",
    isAllowed: true,
    component: OthersKitties,
  },
  {
    to: "*",
    isAllowed: true,
    component: Error404,
  },
];
