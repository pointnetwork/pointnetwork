import React, { useEffect, useState } from 'react';
import { useAppContext } from '@hooks/AppContext';
import { MailIcon, UserIcon } from '@heroicons/react/outline';
import { UploadIcon } from '@heroicons/react/solid';

import * as ContractService from '@services/ContractService';
import * as IdentityService from '@services/IdentityService';
import * as StorageService from '@services/StorageService';
import * as WalletService from '@services/WalletService';

import CONSTANTS from '../constants';

const Compose: React.FC<{}> = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const { walletAddress, identity } = useAppContext();

  const [toIdentity, setToIdentity] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  function toIdentityChangedHandler(event: React.ChangeEvent<HTMLInputElement>) {
    setToIdentity(event.target.value);
  }

  function subjectChangedHandler(event: React.ChangeEvent<HTMLInputElement>) {
    setSubject(event.target.value);
  }

  function messageChangedHandler(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value);
  }

  useEffect(() => {
    if (identity) {
      setLoading(false);
    }
  }, [identity]);

  async function onSendHandle() {
    const [owner, publicKey] = await Promise.all([
      IdentityService.identityToOwner(toIdentity),
      IdentityService.publicKeyByIdentity(toIdentity),
    ]);

    if (owner === CONSTANTS.AddressZero) {
      console.log('hace algo papu');
      return;
    }

    const { encryptedMessage, encryptedSymmetricObjJSON } = await WalletService.encryptData(
      publicKey,
      message
    );

    const storedEncryptedMessageId = await StorageService.putString(encryptedMessage);

    const response = await ContractService.sendContract({
      contract: 'PointEmail2',
      method: 'send',
      params: [owner, storedEncryptedMessageId, encryptedSymmetricObjJSON],
    });

    console.log(response);
  }

  return (
    <div className="container px-6 mx-auto grid">
      <h2 className="my-3 text-gray-700 dark:text-gray-200">
        <div className="text-2xl font-semibold">Compose</div>
        <div>From: @{identity}</div>
      </h2>
      <div className="px-4 py-3 mb-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <label className="block text-sm">
          <span className="text-gray-700 dark:text-gray-400">To</span>
          <div className="relative text-gray-500 focus-within:text-purple-600 dark:focus-within:text-purple-400">
            <input
              className="
                block
                w-full
                pl-10
                mt-1
                mb-5
                border-2
                rounded
                text-sm
                text-black
                dark:text-gray-300
                dark:border-gray-600
                dark:bg-gray-700
                focus:border-purple-400
                focus:outline-nonemb-5
                focus:shadow-outline-purple
                dark:focus:shadow-outline-gray
                form-input
              "
              value={toIdentity}
              onChange={toIdentityChangedHandler}
              placeholder="Jane Doe"
            />
            <div className="absolute inset-y-0 flex items-center ml-3 pointer-events-none">
              <UserIcon className="w-5 h-6" />
            </div>
          </div>
        </label>

        <label className="block text-sm">
          <span className="text-gray-700 dark:text-gray-400">Subject</span>
          <div className="relative text-gray-500 focus-within:text-purple-600 dark:focus-within:text-purple-400">
            <input
              className="
                block
                w-full
                pl-10
                mt-1
                mb-5
                border-2
                rounded
                text-sm
                text-black
                dark:text-gray-300
                dark:border-gray-600
                dark:bg-gray-700
                focus:border-purple-400
                focus:outline-none
                focus:shadow-outline-purple
                dark:focus:shadow-outline-gray
                form-input
              "
              placeholder="Jane Doe"
              value={subject}
              onChange={subjectChangedHandler}
            />
            <div className="absolute inset-y-0 flex items-center ml-3 pointer-events-none">
              <MailIcon className="w-5 h-6" />
            </div>
          </div>
        </label>

        <label className="block mt-4 text-sm">
          <span className="text-gray-700 dark:text-gray-400">Message</span>
          <textarea
            className="
              block 
              w-full 
              mt-1 
              mb-5
              text-sm
              border-2
              rounded
              dark:text-gray-300 
              dark:border-gray-600 
              dark:bg-gray-700 
              form-textarea 
              focus:border-purple-400 
              focus:outline-none 
              focus:shadow-outline-purple 
              dark:focus:shadow-outline-gray
            "
            rows={10}
            placeholder="Enter some long form content."
            value={message}
            onChange={messageChangedHandler}
          ></textarea>
        </label>
        <button
          onClick={onSendHandle}
          className="
            w-lg
            flex
            flex-row
            rounded
            items-center
            border-2
            border-green-600
            bg-green-500
            text-white
            justify-center
            p-2
            px-10
            mt-1
            mb-5
          "
        >
          <UploadIcon className="w-5 h-5 mr-2" />
          <span>Encrypt & Send Email</span>
        </button>
      </div>
    </div>
  );
};

export default Compose;
