import React, { useEffect, useState } from 'react';
import { StarIcon, CheckIcon, RefreshIcon } from '@heroicons/react/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/outline';
import Paginator from '@components/Paginator';
import { useAppContext } from '@hooks/AppContext';
import { NavigationType, Link } from 'react-router-dom';
import dayjs from '@utils/dayjs';

import * as ContractService from '@services/ContractService';
import * as IdentityService from '@services/IdentityService';

type Email = {
  id: number;
  from: string;
  subject: string;
  encryptedMessageId: string;
  createdAt: number;
};

const InboxRow: React.FC<{ email: Email }> = (props) => {
  const { email } = props;
  return (
    <tr className="text-gray-700 dark:text-gray-400">
      <td className="px-4 py-2">
        <button className="border-2 rounded border-gray-300 text-xs text-gray-400 mr-2">
          <CheckIcon className="w-5 h-5" />
        </button>
        <button className="border-1 w-10 h-10 text-sm p-2 text-gray-400">
          <StarIconOutline className="w-5 h-5" />
        </button>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="w-full">{email.from}</span>
      </td>
      <td className="px-4 py-3 text-sm">
        <Link to={`/show?id=${email.encryptedMessageId}`}>
          <span className="w-full">Message</span>
        </Link>
      </td>
      <td className="px-4 py-3 text-xs">
        <span className="px-2 py-1 font-semibold leading-tight text-red-700 bg-red-100 rounded-full dark:bg-red-700 dark:text-red-100">
          Important
        </span>
        <span className="px-2 py-1 font-semibold leading-tight text-green-700 bg-green-100 rounded-full dark:bg-green-700 dark:text-green-100">
          Approved
        </span>
      </td>
      <td className="px-4 py-3 text-sm">{dayjs(email.createdAt).format('MMMM DD, hh:mm')}</td>
    </tr>
  );
};

const Inbox: React.FC<{}> = () => {
  const emails = Array.from(Array(20)).map((_, index) => ({
    id: index,
    from: `From ${index}`,
    subject: `This is a subject ${index}`,
    date: new Date(),
  }));

  const { walletAddress, identity } = useAppContext();

  const [loading, setLoading] = useState<boolean>(false);
  const [inboxEmails, setInboxEmails] = useState([]);

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    (async () => {
      setLoading(true);
      let emails = await ContractService.callContract({
        contract: 'PointEmail2',
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

      console.log(emails);

      setInboxEmails(emails);
      setLoading(false);
    })();
  }, [walletAddress]);

  return (
    <div className="container px-6 mx-auto grid">
      <h2 className="my-3 text-gray-700 dark:text-gray-200">
        <div className="text-2xl font-semibold">Inbox for @{identity}</div>
        <div>{walletAddress}</div>
      </h2>
      <div className="w-full overflow-hidden rounded-lg shadow-xs">
        <div className="w-full overflow-x-auto">
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
                  <button className="text-xs m-2 text-gray-500">
                    <RefreshIcon className="w-5 h-5" />
                  </button>
                </th>
                <th></th>
                <th></th>
                <th></th>
                <th>
                  <Paginator />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800">
              {inboxEmails.map((email) => (
                <InboxRow email={email} />
              ))}
            </tbody>
          </table>
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
            <Paginator />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
