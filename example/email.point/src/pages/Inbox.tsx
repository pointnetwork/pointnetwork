import React, { useEffect, useState } from 'react';
import { InboxIcon } from '@heroicons/react/solid';
import Spinner from '@components/Spinner';

import { useDispatch, useSelector } from 'react-redux';

import { actions as uiActions } from '@store/modules/ui';

import Table from '@components/Table';

import * as ContractService from '@services/ContractService';

import EmailMapper from '@mappers/Email';

import { selectors as identitySelectors } from '@store/modules/identity';

const Inbox: React.FC<{}> = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [inboxEmails, setInboxEmails] = useState<Email[]>([]);

  const walletAddress = useSelector(identitySelectors.getWalletAddress);
  const identity = useSelector(identitySelectors.getIdentity);

  const dispatch = useDispatch();

  async function getInboxEmails() {
    let emails = await ContractService.callContract({
      contract: 'PointEmail',
      method: 'getAllEmailsByToAddress',
      params: [walletAddress],
    });

    emails = await Promise.all(emails.map(EmailMapper));

    return emails.sort(
      ({ createdAt: ca1 }: { createdAt: number }, { createdAt: ca2 }: { createdAt: number }) =>
        ca2 - ca1
    );
  }

  function loadInbox() {
    setLoading(true);
    getInboxEmails()
      .then((emails) => {
        setInboxEmails(emails);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);

        dispatch(
          uiActions.showErrorNotification({
            message: 'Something went wrong.',
          })
        );
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!walletAddress) {
      return;
    }
    loadInbox();
  }, [walletAddress]);

  return (
    <>
      {loading ? (
        <div className="container w-full p-10 flex flex-col items-center">
          <Spinner className="w-8 h-8" />
          <p className="mt-2">Loading inbox...</p>
        </div>
      ) : (
        <div className="container px-6 mx-auto grid">
          <h2 className="my-3 text-gray-700 dark:text-gray-200">
            <div className="text-2xl font-semibold">Inbox for @{identity}</div>
            <div>{walletAddress}</div>
          </h2>
          <div className="w-full overflow-hidden rounded-lg shadow-xs">
            <div className="w-full overflow-x-auto">
              {!inboxEmails?.length ? (
                <div className="w-full text-gray-500 whitespace-no-wrap p-10 text-center bg-white shadow-md dark:bg-gray-800 flex flex-col justify-center items-center">
                  <InboxIcon className="w-20 h-20 mb-2" />
                  <p>Inbox is empty.</p>
                </div>
              ) : (
                <Table emails={inboxEmails} loading={loading} onRefreshHandler={loadInbox} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Inbox;
