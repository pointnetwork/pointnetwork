import React from "react";
import { Typography, Box } from "@material-ui/core";
import { KittyGrid } from "../components/KittyGrid/KittyGrid";
import { useOwnedKitties } from "../hooks/useOwnedKitties";
import { Redirect, useParams } from "react-router";
import { AccountAddress } from "../components/AccountAddress/AccountAddress";

export const OthersKitties = () => {
  let { address } = useParams();
  const { kitties, hasError } = useOwnedKitties(address);

  if (!address || hasError) {
    return <Redirect to="404" />;
  }

  return (
    <div>
      <Typography variant="h2" component="h1" gutterBottom>
        <Box display="inline-flex" alignItems="center">
          All kitties of
          <Box display="inline-flex" alignItems="center" ml={2}>
            <AccountAddress iconSize={72}>{address}</AccountAddress>
          </Box>
        </Box>
      </Typography>
      <KittyGrid ids={kitties} />
    </div>
  );
};
