import React, { MouseEventHandler, useState } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, CheckIcon, RefreshIcon } from '@heroicons/react/solid';
import { StarIcon as StarIconOutline, BanIcon } from '@heroicons/react/outline';
import dayjs from 'dayjs';

import Spinner from './Spinner';

import * as ContractService from '@services/ContractService';

type Props = {
  email: Email;
  onChecked?: MouseEventHandler<HTMLButtonElement>;
  onMarkedAsImportant?: MouseEventHandler<HTMLButtonElement>;
};

const InboxRow: React.FC<Props> = (props) => {
  const { email, onChecked, onMarkedAsImportant } = props;
  const [marking, setMarking] = useState<Boolean>(false);

  function onMarkedAsImportantHandler() {
    setMarking(true);
    ContractService.sendContract({
      contract: 'PointEmail',
      method: 'markAsImportant',
      params: [email.encryptedMessageId],
    })
      .then(() => {
        setMarking(false);
      })
      .catch((error) => {
        console.error(error);
        setMarking(false);
      });
  }

  return (
    <tr className="text-gray-700 dark:text-gray-400">
      <td className="px-4 py-2 flex items-center">
        {onChecked && (
          <button
            onClick={onChecked}
            className="border-2 rounded w-6 h-6 border-gray-300 text-xs text-gray-400 mr-2"
          >
            {email.checked && <CheckIcon className="w-5 h-5" />}
          </button>
        )}
        {onMarkedAsImportant && (
          <button className="border-1 w-10 h-10 text-sm p-2 text-gray-400">
            {email.important ? (
              <StarIcon className="w-5 h-5" />
            ) : (
              <StarIconOutline className="w-5 h-5" />
            )}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="w-full">@{email.fromIdentity}</span>
      </td>
      <td className="px-4 py-3 text-sm">{email.subject}</td>
      <td className="px-4 py-3 text-sm">
        <Link to={`/show?id=${email.encryptedMessageId}`}>
          <span className="w-full underline">Decrypt Message</span>
        </Link>
      </td>
      <td className="px-4 py-3 text-sm">{dayjs(email.createdAt).format('MMMM DD, hh:mm')}</td>
    </tr>
  );
};

type TableProps = {
  emails: Email[];
  loading: boolean;
  onRemoveSelectedHandler?: MouseEventHandler;
  onRefreshHandler?: MouseEventHandler;
  onCheckItemHandler?: MouseEventHandler<HTMLButtonElement>;
};
const Table: React.FC<TableProps> = (props) => {
  const { loading, emails, onRemoveSelectedHandler, onRefreshHandler, onCheckItemHandler } = props;

  return (
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
            {onCheckItemHandler && (
              <button
                className="
                  border-2
                  rounded
                  w-6
                  h-6
                  border-gray-300
                  text-xs
                  p-1
                  text-gray-400
                  mr-2
                "
              ></button>
            )}
            {onRemoveSelectedHandler && (
              <button
                className="text-xs m-2 text-gray-500"
                onClick={onRemoveSelectedHandler}
                disabled={!!loading}
              >
                <BanIcon className="w-5 h-5" />
              </button>
            )}
            {onRefreshHandler && (
              <button
                className="text-xs m-2 text-gray-500"
                onClick={onRefreshHandler}
                disabled={!!loading}
              >
                <RefreshIcon className="w-5 h-5" />
              </button>
            )}
          </th>
          <th className="px-4 py-3">From</th>
          <th className="px-4 py-3">Subject</th>
          <th className="px-4 py-3">Message</th>
          <th className="px-4 py-3">Date</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800">
        {emails.map((email) => (
          <InboxRow email={email} onChecked={onCheckItemHandler} />
        ))}
      </tbody>
    </table>
  );
};

export default Table;
