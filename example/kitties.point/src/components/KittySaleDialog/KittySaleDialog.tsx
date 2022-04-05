import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Box,
} from "@material-ui/core";
import { FetchedKitty } from "../../hooks/useFetchKitty";
import {
  useMarketPlaceContract,
  useKittyCoreContract,
} from "../../hooks/useContract";
import { useSnackbar } from "notistack";
import { parseEther } from "@ethersproject/units";
import { Loader } from "../Loader/Loader";
import { useStore } from "../../store/Store";
import { useKittyOffer, FetchedOffer } from "../../hooks/useKittyOffer";
import { useFunction } from "../../hooks/useFunction";
import { useFetch } from "../../hooks/useFetch";

interface KittySaleDialogProps {
  kittyData: FetchedKitty;
  name: string;
  isOpen: boolean;
  onClose: () => void;
  offer?: FetchedOffer;
}

export const KittySaleDialog = ({
  isOpen,
  onClose,
  kittyData,
  name,
  offer,
}: KittySaleDialogProps) => {
  const [hasMarketPlaceApproved, setHasMarketPlaceApproved] = useState(false);
  const [sellPrice, setSellPrice] = useState<number | null>(
    offer ? Number(offer) : null
  );
  const [inputError, setInputError] = useState<string | null>(null);

  const kittyCore = useKittyCoreContract();
  const { account } = useStore();
  const marketPlace = useMarketPlaceContract();
  const { loadOffer } = useKittyOffer(kittyData.id);

  const placeOffer = useFunction(marketPlace, "setOffer");
  const giveApproval = useFunction(kittyCore, "setApprovalForAll");
  const isApprovedForAll = useFetch<boolean>(kittyCore, "isApprovedForAll", {
    fetchOnLoadArgs: [account, marketPlace?.address],
  });

  console.log({
    hasMarketPlaceApproved,
    isApprovedForAllVal: isApprovedForAll.value,
  });

  const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const newValue = Number(event.currentTarget.value);
    setInputError(null);

    if (Number.isNaN(newValue)) {
      setSellPrice(null);
      setInputError("Invalid value");
    }

    setSellPrice(newValue);
  };

  const handleGiveApproval = async () => {
    giveApproval.call({
      args: [marketPlace!.address, true],
      afterConfirmation: () => setHasMarketPlaceApproved(true),
    });
  };

  const handlePlaceOffer = async () => {
    const parsedPrice = sellPrice
      ? parseEther(`${sellPrice}`).toString()
      : undefined;

    placeOffer.call({
      args: [parsedPrice, kittyData.id],
      afterResponse: onClose,
      afterConfirmation: () => loadOffer(marketPlace, true),
    });
  };

  if (isApprovedForAll.isFetching) {
    return (
      <Dialog open={isOpen} onClose={onClose}>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={8}>
            <Loader size={50} />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (isApprovedForAll.hasError) {
    return (
      <Dialog open={isOpen} onClose={onClose}>
        <DialogTitle>Request error</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Could not determine if this account has approved the usage for the
            marketplace.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (giveApproval.hasError) {
    return (
      <Dialog open={isOpen} onClose={onClose}>
        <DialogTitle>Request error</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Could not set the approval correctly.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!hasMarketPlaceApproved && !isApprovedForAll.value) {
    return (
      <Dialog open={isOpen} onClose={onClose}>
        <DialogTitle>Approval required</DialogTitle>
        <DialogContent>
          <DialogContentText>
            In order to place orders on the marketplace, you need to give
            approval to the marketplace to transfer your kitties. This needs to
            be done only once.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGiveApproval}
          >
            Give approval
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>
        Sell {name} (#{kittyData.id})
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Selling {name} will put it on the marketplace where anyone can buy
          {name}. You can always remove it from the marketplace, as long as
          nobody has made an offer.
        </DialogContentText>
        {placeOffer.hasError && (
          <DialogContentText color="error">
            Could not place the offer, an error occured.
          </DialogContentText>
        )}
      </DialogContent>
      <DialogContent>
        <TextField
          label="Sell price"
          type="number"
          placeholder="1.00"
          variant="outlined"
          defaultValue={sellPrice}
          onBlur={handleInputBlur}
          error={!!inputError}
          helperText={inputError}
          InputProps={{
            endAdornment: <InputAdornment position="end">Ξ</InputAdornment>,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="primary" onClick={handlePlaceOffer}>
          Place on marketplace
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
