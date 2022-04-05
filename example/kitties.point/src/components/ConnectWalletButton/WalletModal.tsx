import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  DialogContentText,
  Box,
} from "@material-ui/core";
import { useWeb3React } from "@web3-react/core";
import { AccountAddress } from "../AccountAddress/AccountAddress";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal = ({ isOpen, onClose }: WalletModalProps) => {
  const { deactivate, account } = useWeb3React();

  if (!account) {
    return null;
  }
  return (
    <Dialog
      onClose={onClose}
      aria-labelledby="wallet-modal-title"
      open={isOpen}
    >
      <DialogTitle id="wallet-modal-title">Account</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This is your account that is currenty in use. You can change an
          account via Metamask, or disconnect the current account via the button
          below.
        </DialogContentText>
      </DialogContent>
      <DialogContent dividers>
        <Box display="flex" alignContent="center">
          <AccountAddress>{account}</AccountAddress>
          <Button onClick={deactivate} color="secondary">
            Disconnect
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
