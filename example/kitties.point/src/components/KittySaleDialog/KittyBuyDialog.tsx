import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
} from "@material-ui/core";
import { FetchedKitty } from "../../hooks/useFetchKitty";
import { useMarketPlaceContract } from "../../hooks/useContract";
import { useKittyOffer, FetchedOffer } from "../../hooks/useKittyOffer";
import { AccountAddress } from "../AccountAddress/AccountAddress";
import { useFunction } from "../../hooks/useFunction";

interface KittyBuyDialogProps {
  kittyData: FetchedKitty;
  name: string;
  isOpen: boolean;
  onClose: () => void;
  offer: FetchedOffer;
}

export const KittyBuyDialog = ({
  isOpen,
  onClose,
  kittyData,
  name,
  offer,
}: KittyBuyDialogProps) => {
  const { loadOffer } = useKittyOffer(kittyData.id);
  const marketPlace = useMarketPlaceContract();
  const buyKitty = useFunction(marketPlace, "buyKitty");

  const acceptOffer = async () => {
    await buyKitty.call({
      value: offer._rawPrice,
      args: [kittyData.id],
      afterResponse: onClose,
      afterConfirmation: () => loadOffer(marketPlace, true),
    });
    loadOffer(marketPlace, true);
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>
        Buy {name} (#{kittyData.id})
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          You can buy {name} from the marketplace. The price is Ξ {offer.price}.
        </DialogContentText>
        <Typography variant="overline">Current owner:</Typography>
        <br />
        <AccountAddress fullAddress>{offer.seller}</AccountAddress>
        {buyKitty.hasError && (
          <DialogContentText color="error">
            Could not accept the offer, an error occured.
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="primary" onClick={acceptOffer}>
          Buy for Ξ{offer.price}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
