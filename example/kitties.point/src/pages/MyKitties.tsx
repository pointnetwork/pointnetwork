import React, { useState } from "react";
import { Typography, Button, Box } from "@material-ui/core";
import { KittyGrid } from "../components/KittyGrid/KittyGrid";
import { useStore } from "../store/Store";
import { useOwnedKitties } from "../hooks/useOwnedKitties";
import { Redirect } from "react-router";
import { useKittyCoreContract } from "../hooks/useContract";
import { FetchedKitty } from "../hooks/useFetchKitty";
import { Cat } from "../components/Cat/Cat";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { Header } from "../components/Header/Header";
import { useFunction } from "../hooks/useFunction";

export const MyKitties = () => {
  const { account } = useStore();
  const { kitties, hasError, loadKittyIds } = useOwnedKitties(account);
  const kittyCore = useKittyCoreContract();
  const breed = useFunction(kittyCore, "breed");
  const [breedKitty1, setBreedKitty1] = useState<null | FetchedKitty>(null);
  const [breedKitty2, setBreedKitty2] = useState<null | FetchedKitty>(null);

  if (hasError) {
    // For now handle all errors as 404 errors
    return <Redirect to="/404" />;
  }

  const handleBreed = async () => {
    if (breedKitty1 === null || breedKitty2 === null || kitties.length <= 1) {
      return;
    }

    breed.call({
      args: [breedKitty1.id, breedKitty2.id],
      afterResponse: () => {
        setBreedKitty1(null);
        setBreedKitty2(null);
      },
      afterConfirmation: loadKittyIds,
    });
  };

  return (
    <div>
      <Header title="My kitties" subTitle="The cutest of them all" />

      <Box my={4}>
        {breedKitty1 !== null && breedKitty2 !== null ? (
          <Box maxWidth={400} mx="auto" my={6} textAlign="center">
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb={2}
            >
              <Cat dna={breedKitty1.genes} maxWidth={100} />
              <FontAwesomeIcon
                icon={faHeart}
                style={{ color: "#dd1a7c" }}
                size="lg"
              />
              <Cat dna={breedKitty2.genes} maxWidth={100} />
            </Box>
            <Button onClick={handleBreed} color="primary" variant="contained">
              Give them some privacy
            </Button>
          </Box>
        ) : (
          <Typography variant="subtitle1" gutterBottom align="center">
            Drag 2 kitties on top of eachother to select them for breeding.
          </Typography>
        )}
      </Box>

      <KittyGrid
        ids={kitties}
        isBreedable
        onBreed={(kitty1, kitty2) => {
          setBreedKitty1(kitty1);
          setBreedKitty2(kitty2);
        }}
      />
    </div>
  );
};
