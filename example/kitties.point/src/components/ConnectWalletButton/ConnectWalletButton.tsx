import React, { useState } from "react";
import { Button } from "@material-ui/core";

import { InjectedConnector } from "@web3-react/injected-connector";
import { useWeb3React, UnsupportedChainIdError } from "@web3-react/core";
import { useSnackbar } from "notistack";
import { AccountAddress } from "../AccountAddress/AccountAddress";
import { supportedChains } from "../../config/chain";
import { WalletModal } from "./WalletModal";

export const ConnectButton = () => {
  const { error, activate, active, account, setError } = useWeb3React();
  const { enqueueSnackbar } = useSnackbar();
  const supportedChainIds = supportedChains.map(({ id }) => id);
  const injected = new InjectedConnector({
    supportedChainIds,
  });
  const [isWalletModalOpen, setIsWalletModalopen] = useState(false);
  const handleWalletModalClose = () => setIsWalletModalopen(false);
  const handleWalletModalOpen = () => setIsWalletModalopen(true);

  const handleError = (error: Error) => {
    const isUnsupportedChainIdError = error instanceof UnsupportedChainIdError;

    if (isUnsupportedChainIdError) {
      enqueueSnackbar(
        `Wrong network: supported networks are: ${supportedChains
          .map(({ label }) => label)
          .join(", ")}.`,
        {
          variant: "error",
          preventDuplicate: true,
          key: "connect-wallet-error",
        }
      );
    } else {
      enqueueSnackbar(`Could not connect to network: unknown error.`, {
        variant: "error",
        preventDuplicate: true,
        key: "connect-wallet-error",
      });
    }
    setError(error);
  };

  const connect = () => {
    activate(injected, handleError);
    setIsWalletModalopen(false);
  };

  if (active && account) {
    return (
      <>
        <Button
          onClick={handleWalletModalOpen}
          color="primary"
          variant="contained"
        >
          <AccountAddress>{account}</AccountAddress>
        </Button>
        <WalletModal
          isOpen={isWalletModalOpen}
          onClose={handleWalletModalClose}
        />
      </>
    );
  }

  return (
    <>
      <Button onClick={connect} color="primary" variant="contained">
        Connect wallet
      </Button>
    </>
  );
};
