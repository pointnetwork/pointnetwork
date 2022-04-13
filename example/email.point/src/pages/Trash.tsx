import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { InboxIcon } from '@heroicons/react/solid';

import { actions as uiActions } from '@store/modules/ui';
import { selectors as identitySelectors } from '@store/modules/identity';

import EmailMapper from '@mappers/Email';

import * as ContractService from '@services/ContractService';

import Table from '@components/Table';
import Spinner from '@components/Spinner';

const Important: React.FC<{}> = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [emails, setEmails] = useState<Email[]>([]);

  const identity = useSelector(identitySelectors.getIdentity);

  const dispatch = useDispatch();

  async function loadImportantEmails() {
    let emails = await ContractService.callContract({
      contract: 'PointEmail',
      method: 'getDeletedEmails',
    });

    emails = await Promise.all(emails.map(EmailMapper));

    return emails.sort(
      ({ createdAt: ca1 }: { createdAt: number }, { createdAt: ca2 }: { createdAt: number }) =>
        ca2 - ca1
    );
  }

  function refreshTable() {
    loadImportantEmails()
      .then(() => {
        setLoading(false);
        setEmails(emails);
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
    if (!identity) {
      return;
    }
    refreshTable();
  }, [identity]);

  return (
    <>
      {loading ? (
        <div className="container w-full p-10 flex flex-col items-center">
          <Spinner className="w-8 h-8" />
          <p className="mt-2">Loading...</p>
        </div>
      ) : (
        <div className="container px-6 mx-auto grid">
          <h2 className="my-3 text-gray-700 dark:text-gray-200">
            <div className="text-2xl font-semibold">Trash</div>
          </h2>
          <div className="w-full overflow-hidden rounded-lg shadow-xs">
            <div className="w-full overflow-x-auto">
              {!emails?.length ? (
                <div className="w-full text-gray-500 whitespace-no-wrap p-10 text-center bg-white shadow-md dark:bg-gray-800 flex flex-col justify-center items-center">
                  <InboxIcon className="w-20 h-20 mb-2" />
                  <p>Folder is empty.</p>
                </div>
              ) : (
                <Table emails={emails} loading={loading} onRefreshHandler={refreshTable} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Important;
