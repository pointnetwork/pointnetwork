import React, { useState } from "react";
import { useParams, Redirect } from "react-router-dom";
import {
  Card,
  Box,
  CardContent,
  Grid,
  Typography,
  Link,
  Button,
} from "@material-ui/core";
import { useFetchKitty } from "../hooks/useFetchKitty";
import { Cat } from "../components/Cat/Cat";
import { BirthdayChip } from "../components/Chips/BirthdayChip";
import { GenChip } from "../components/Chips/GenChip";
import { AccountAddress } from "../components/AccountAddress/AccountAddress";
import { useKittyOwner } from "../hooks/useKittyOwner";
import { Link as RouterLink } from "react-router-dom";
import { FetchKittyCard } from "../components/FetchKittyCard/FetchKittyCard";
import { useChildrenKitties } from "../hooks/useChildrenKitties";
import { ColorChip } from "../components/Chips/ColorChip";
import { getConfigFromDna } from "../utils/getConfigFromDna";
import { PatternChip } from "../components/Chips/PatternChip";
import { EyeChip } from "../components/Chips/EyeChip";
import { DecorationChip } from "../components/Chips/DecorationChip";
import { getCatName } from "../utils/getAttributeName";
import { useStore } from "../store/Store";
import { KittySaleDialog } from "../components/KittySaleDialog/KittySaleDialog";
import { useKittyOffer } from "../hooks/useKittyOffer";
import { RemoveSaleDialog } from "../components/KittySaleDialog/RemoveSaleDialog";
import { LoaderBox } from "../components/LoaderBox/LoaderBox";
import { KittyBuyDialog } from "../components/KittySaleDialog/KittyBuyDialog";
import { useKittyCoreContract } from "../hooks/useContract";

export const KittyDetail = () => {
  let { id } = useParams();
  const { kittyData, isFetching, hasError } = useFetchKitty(Number(id));
  const { owner, fetchOwner } = useKittyOwner(id);
  const { children } = useChildrenKitties(id);
  const kittyCore = useKittyCoreContract();
  // Make sure to corresponding offer
  useKittyOffer(id);
  // But read data from the store because it can change when still being on this page
  const { account, offers } = useStore();
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [isRemoveSaleDialogOpen, setIsRemoveSaleDialogOpen] = useState(false);
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);

  if (hasError) {
    // For now handle all errors as 404 errors
    return <Redirect to="/404" />;
  }

  if (isFetching) {
    return <LoaderBox />;
  }

  if (!kittyData) {
    return null;
  }

  const offer = offers[id];

  const kittyConfig = getConfigFromDna(kittyData.genes);
  const name = getCatName(kittyConfig, kittyData.id);
  const isOwner = account === owner;

  return (
    <>
      <Box>
        <Box mb={2}>
          <Card variant="outlined">
            <CardContent>
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                py={4}
              >
                <Cat dna={kittyData.genes} maxWidth={320} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <GenChip gen={kittyData.generation} />
        <BirthdayChip birthTime={kittyData.birthTime} />

        <Box maxWidth={800} mx="auto" mt={5}>
          <Grid container spacing={7}>
            <Grid item xs={12} sm={8}>
              <Typography variant="h3">{name}</Typography>
              <Typography variant="h4" color="textSecondary">
                # {kittyData.id}
              </Typography>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="flex-start"
                mt={3}
              >
                <ColorChip kittyConfig={kittyConfig} />
                <PatternChip kittyConfig={kittyConfig} />
                <EyeChip kittyConfig={kittyConfig} />
                <DecorationChip kittyConfig={kittyConfig} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box mb={2}>
                <Typography variant="overline">Owner</Typography>
                <br />
                {owner ? (
                  <Link component={RouterLink} to={`/profile/${owner}`}>
                    <AccountAddress>{owner}</AccountAddress>
                  </Link>
                ) : (
                  "..."
                )}
              </Box>
              <Box>
                {isOwner && !offer?.active && (
                  <Button
                    color="secondary"
                    variant="contained"
                    fullWidth
                    onClick={() => setIsSaleDialogOpen(true)}
                  >
                    Sell
                  </Button>
                )}

                {isOwner && offer?.active && (
                  <>
                    <Typography paragraph>
                      {name} is currently on the marketplace for Ξ{offer.price}
                    </Typography>
                    <Button
                      color="secondary"
                      variant="contained"
                      fullWidth
                      onClick={() => setIsRemoveSaleDialogOpen(true)}
                    >
                      Remove from market
                    </Button>
                  </>
                )}

                {!isOwner && account && offer?.active && (
                  <>
                    <Typography paragraph>
                      {name} is currently on the marketplace for Ξ{offer.price}
                    </Typography>
                    <Button
                      color="secondary"
                      variant="contained"
                      fullWidth
                      onClick={() => setIsBuyDialogOpen(true)}
                    >
                      Buy for Ξ{offer.price}
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>

          {kittyData.momId || kittyData.dadId ? (
            <Box mt={9}>
              <Typography variant="h4" gutterBottom>
                Parents
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="h6">Mom</Typography>
                  <FetchKittyCard id={kittyData.momId} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="h6">Dad</Typography>
                  <FetchKittyCard id={kittyData.dadId} />
                </Grid>
              </Grid>
            </Box>
          ) : null}

          {children.length > 0 && (
            <Box mt={9}>
              <Typography variant="h4" gutterBottom>
                Children
              </Typography>
              <Grid container spacing={4}>
                {children.map((childId) => (
                  <Grid item xs={6} sm={4} key={childId}>
                    <FetchKittyCard id={childId} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      </Box>
      {isSaleDialogOpen && (
        <KittySaleDialog
          name={name}
          kittyData={kittyData}
          isOpen={isSaleDialogOpen}
          onClose={() => setIsSaleDialogOpen(false)}
          offer={offer}
        />
      )}
      {isRemoveSaleDialogOpen && (
        <RemoveSaleDialog
          name={name}
          kittyData={kittyData}
          isOpen={isRemoveSaleDialogOpen}
          onClose={() => setIsRemoveSaleDialogOpen(false)}
          offer={offer}
        />
      )}
      {isBuyDialogOpen && offer && (
        <KittyBuyDialog
          name={name}
          kittyData={kittyData}
          isOpen={isBuyDialogOpen}
          onClose={() => {
            fetchOwner(kittyCore);
            setIsBuyDialogOpen(false);
          }}
          offer={offer}
        />
      )}
    </>
  );
};
