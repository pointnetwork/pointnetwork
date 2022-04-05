import React from "react";
import { Contract } from "@ethersproject/contracts";
import { BigNumber } from "@ethersproject/bignumber";
import { useCallback, useState } from "react";
import { useSnackbar } from "notistack";
import { Button } from "@material-ui/core";

export const calculateGasMargin = (value: BigNumber) =>
  value
    .mul(BigNumber.from(10000).add(BigNumber.from(1000)))
    .div(BigNumber.from(10000));

export const contactCall = async (
  contract: Contract,
  name: string,
  args: unknown[] = [],
  value?: BigNumber
) => {
  const parsedValue = value ? value.toString() : undefined;

  const estimatedGas = await contract.estimateGas[name](...args, {
    value: parsedValue,
  });

  const response = await contract[name](...args, {
    value: parsedValue,
    gasLimit: calculateGasMargin(estimatedGas),
  });

  return response;
};

const useTransactionMessage = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const addTransactionMessage = (hash: string) => {
    const notificationKey = hash;
    const notificationMessage = `Pending transaction: ${hash}`;
    const action = () => (
      <>
        <Button
          color="inherit"
          onClick={() => {
            closeSnackbar(notificationKey);
          }}
        >
          Dismiss
        </Button>
      </>
    );

    enqueueSnackbar(notificationMessage, {
      persist: true,
      key: notificationKey,
      action,
    });

    return notificationKey;
  };

  const removeTransactionMessage = (key: string) => closeSnackbar(key);
  const showCompleteMessage = (hash: string) =>
    enqueueSnackbar(`Transaction ${hash} completed`, {
      variant: "success",
    });
  const showErrorMessage = (hash: string) =>
    enqueueSnackbar(`Transaction ${hash} failed`, {
      variant: "error",
    });

  return {
    addTransactionMessage,
    removeTransactionMessage,
    showCompleteMessage,
    showErrorMessage,
  };
};

export const useFunction = (contract: Contract | null, name: string) => {
  const [hasError, setHasError] = useState(false);

  const {
    addTransactionMessage,
    removeTransactionMessage,
    showCompleteMessage,
  } = useTransactionMessage();

  const call = useCallback(
    async ({
      args = [],
      value,
      confirmations = 1,
      afterResponse = () => {},
      afterConfirmation = () => {},
    }: {
      args?: unknown[];
      value?: BigNumber;
      confirmations?: number;
      afterResponse?: () => void;
      afterConfirmation?: () => void;
    } = {}) => {
      setHasError(false);

      if (!contract) {
        setHasError(true);
        return;
      }

      try {
        const response = await contactCall(contract, name, args, value);
        afterResponse();
        const notificationKey = addTransactionMessage(response.hash);
        await response.wait(confirmations);
        afterConfirmation();
        removeTransactionMessage(notificationKey);
        showCompleteMessage(response.hash);
      } catch (error) {
        console.error(`Error while calling "${name}"`, error);
        setHasError(true);
      }
    },
    [
      contract,
      name,
      addTransactionMessage,
      removeTransactionMessage,
      showCompleteMessage,
    ]
  );

  return { call, hasError };
};
