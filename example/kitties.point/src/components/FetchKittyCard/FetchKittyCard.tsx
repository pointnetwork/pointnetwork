import React from "react";
import { KittyCard } from "../KittyCard/KittyCard";
import { useFetchKitty, FetchedKitty } from "../../hooks/useFetchKitty";
import { useKittyOffer } from "../../hooks/useKittyOffer";

interface FetchKittyCardProps {
  id: number;
  isBreedable?: boolean;
  onBreed?: (kitty1: FetchedKitty, kitty2: FetchedKitty) => void;
}

export const FetchKittyCard = ({ id, ...rest }: FetchKittyCardProps) => {
  const { isFetching, hasError, kittyData } = useFetchKitty(id);
  const { offer } = useKittyOffer(id);

  return (
    <KittyCard
      kitty={kittyData}
      isFetching={isFetching}
      hasError={hasError}
      offer={offer}
      {...rest}
    />
  );
};
