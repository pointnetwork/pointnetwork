import React from "react";
import { useAllOffers } from "../hooks/useAllOffers";
import { KittyGrid } from "../components/KittyGrid/KittyGrid";
import { Header } from "../components/Header/Header";

interface MarketPlaceProps {
  children?: React.ReactNode;
}

export const MarketPlace = ({ children }: MarketPlaceProps) => {
  const { offeredKittyIds } = useAllOffers();

  return (
    <div>
      <Header title="MarketPlace" subTitle="You break it, you buy it" />
      <KittyGrid ids={offeredKittyIds} />
    </div>
  );
};
