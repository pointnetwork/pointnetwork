import React, { useState, useEffect } from "react";
import { useKittyCoreContract } from "../hooks/useContract";
import { KittyGrid } from "../components/KittyGrid/KittyGrid";
import { Header } from "../components/Header/Header";

interface CataloguePageProps {
  children?: React.ReactNode;
}

export const CataloguePage = ({ children }: CataloguePageProps) => {
  const [totalSupply, setTotalSupply] = useState(0);
  const kittyCore = useKittyCoreContract();

  // Load kitties
  useEffect(() => {
    if (!kittyCore) {
      return;
    }

    const loadKitties = async () => {
      const totalSupply = await kittyCore.totalSupply();
      const totalSupplyNumber = totalSupply.toNumber();
      setTotalSupply(totalSupplyNumber);
    };

    loadKitties();
  }, [kittyCore]);

  const ids = [...Array(totalSupply)].map((_, i) => i);
  return (
    <div>
      <Header title="Catalogue" subTitle="A list of all the cryptokitties" />

      <KittyGrid ids={ids} />
    </div>
  );
};
