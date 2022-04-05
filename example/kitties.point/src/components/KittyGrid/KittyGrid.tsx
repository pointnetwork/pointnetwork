import React from "react";
import { FetchKittyCard } from "../FetchKittyCard/FetchKittyCard";
import { Grid } from "@material-ui/core";
import { FetchedKitty } from "../../hooks/useFetchKitty";

interface KittyGridProps {
  ids: number[];
  isBreedable?: boolean;
  onBreed?: (kitty1: FetchedKitty, kitty2: FetchedKitty) => void;
}

export const ItemTypes = {
  BREED_CARD: "BreedCard",
};

export const KittyGrid = ({ ids, isBreedable, onBreed }: KittyGridProps) => {
  // Assume the id is the index of the kitties (ie kittie are never deleted)
  return (
    <Grid container spacing={3}>
      {ids.map((id) => {
        return (
          <Grid item xs={6} sm={4} md={3} lg={2} xl={1} key={id}>
            <FetchKittyCard
              id={id}
              isBreedable={isBreedable}
              onBreed={onBreed}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};
