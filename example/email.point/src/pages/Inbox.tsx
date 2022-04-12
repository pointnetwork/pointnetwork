import React, { MouseEventHandler, useEffect, useState } from 'react';
import { StarIcon, CheckIcon, RefreshIcon, InboxIcon } from '@heroicons/react/solid';
import { StarIcon as StarIconOutline, BanIcon } from '@heroicons/react/outline';
import Paginator from '@components/Paginator';
import { useAppContext } from '@hooks/AppContext';
import { Link } from 'react-router-dom';
import dayjs from '@utils/dayjs';
import Spinner from '@components/Spinner';

import { useDispatch } from 'react-redux';

import { actions as uiActions } from '@store/modules/ui';

import * as ContractService from '@services/ContractService';
import * as IdentityService from '@services/IdentityService';

type Email = {
  id: number;
  from: string;
  subject: string;
  encryptedMessageId: string;
  createdAt: number;
  checked?: boolean;
  favorite?: boolean;
};

const InboxRow: React.FC<{ email: Email; onChecked: MouseEventHandler<HTMLButtonElement> }> = (
  props
) => {
  const { email, onChecked } = props;
  return (
    <tr className="text-gray-700 dark:text-gray-400">
      <td className="px-4 py-2 flex items-center">
        <button
          onClick={onChecked}
          className="border-2 rounded w-6 h-6 border-gray-300 text-xs text-gray-400 mr-2"
        >
          {email.checked && <CheckIcon className="w-5 h-5" />}
        </button>
        <button className="border-1 w-10 h-10 text-sm p-2 text-gray-400">
          {email.favorite ? (
            <StarIcon className="w-5 h-5" />
          ) : (
            <StarIconOutline className="w-5 h-5" />
          )}
        </button>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="w-full">@{email.from}</span>
      </td>
      <td className="px-4 py-3 text-sm">
        <Link to={`/show?id=${email.encryptedMessageId}`}>
          <span className="w-full">Message</span>
        </Link>
      </td>
      <td className="px-4 py-3 text-xs"></td>
      {/**
       * disabled yet
       <td className="px-4 py-3 text-xs">
         <span className="px-2 py-1 font-semibold leading-tight text-red-700 bg-red-100 rounded-full dark:bg-red-700 dark:text-red-100">
           Important
         </span>
         <span className="px-2 py-1 font-semibold leading-tight text-green-700 bg-green-100 rounded-full dark:bg-green-700 dark:text-green-100">
           Approved
         </span>
       </td>
       */}
      <td className="px-4 py-3 text-sm">{dayjs(email.createdAt).format('MMMM DD, hh:mm')}</td>
    </tr>
  );
};

const Inbox: React.FC<{}> = () => {
  const { walletAddress, identity } = useAppContext();

  const [loading, setLoading] = useState<boolean>(false);
  const [inboxEmails, setInboxEmails] = useState<Email[]>([]);

  const dispatch = useDispatch();

  async function getInboxEmails() {
    let emails = await ContractService.callContract({
      contract: 'PointEmail',
      method: 'getAllEmailsByToAddress',
      params: [walletAddress],
    });

    emails = await Promise.all(
      emails.map(
        async ([id, from, to, encryptedMessageId, encryptedSymmetricObj, createdAt]: [
          number,
          string,
          string,
          string,
          string,
          number
        ]) => {
          const identity = await IdentityService.ownerToIdentity(from);
          return {
            id,
            from: identity,
            encryptedMessageId,
            encryptedSymmetricObj,
            createdAt: createdAt * 1000,
          };
        }
      )
    );

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
          uiActions.showErrorNotification(
            {
              message: 'Something went wrong.',
            },
            {
              timeout: 1000 * 3,
            }
          )
        );
        setLoading(false);
      });
  }

  function removeSelectedHandler() {
    console.log('remove selected');
  }

  function onCheckedHandler(emailId: number) {
    setInboxEmails((inboxEmails) =>
      inboxEmails.map((inboxEmail) => {
        if (inboxEmail.id === emailId) {
          inboxEmail.checked = !inboxEmail.checked;
        }
        return inboxEmail;
      })
    );
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
                <table className="table-auto w-full whitespace-no-wrap">
                  <thead>
                    <tr
                      className="
                      text-xs
                      font-semibold
                      tracking-wide
                      text-left
                      text-gray-500
                      uppercase
                      border-b
                      dark:border-gray-700
                      bg-gray-50
                      dark:text-gray-400
                      dark:bg-gray-800
                    "
                    >
                      <th className="px-4 py-2 flex flex-row items-center">
                        <button className="border-2 rounded w-6 h-6 border-gray-300 text-xs p-1 text-gray-400 mr-2"></button>
                        <button
                          className="text-xs m-2 text-gray-500"
                          onClick={removeSelectedHandler}
                          disabled={!!loading}
                        >
                          <BanIcon className="w-5 h-5" />
                        </button>
                        <button
                          className="text-xs m-2 text-gray-500"
                          onClick={loadInbox}
                          disabled={!!loading}
                        >
                          <RefreshIcon className="w-5 h-5" />
                        </button>
                      </th>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th>{inboxEmails?.length >= 50 && <Paginator disabled={loading} />}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800">
                    {inboxEmails.map((email) => (
                      <InboxRow email={email} onChecked={() => onCheckedHandler(email.id)} />
                    ))}
                  </tbody>
                </table>
              )}
              <div
                className="
                  w-full
                  flex
                  flex-row
                  items-center
                  justify-end
                  py-2
                "
              >
                {inboxEmails?.length >= 50 && <Paginator disabled={loading} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Inbox;
