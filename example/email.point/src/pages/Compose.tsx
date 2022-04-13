import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { MailIcon, UserIcon } from '@heroicons/react/outline';
import { UploadIcon } from '@heroicons/react/solid';

import Spinner from '@components/Spinner';

import * as ContractService from '@services/ContractService';
import * as IdentityService from '@services/IdentityService';
import * as StorageService from '@services/StorageService';
import * as WalletService from '@services/WalletService';

import { actions as uiActions, constants as uiConstants } from '@store/modules/ui';
import { selectors as identitySelectors } from '@store/modules/identity';

import CONSTANTS from '../constants';

enum ERRORS {
  INVALID_RECIPIENT,
}

const Compose: React.FC<{}> = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const identity = useSelector(identitySelectors.getIdentity);

  const dispatch = useDispatch();

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

  function cleanForm() {
    setToIdentity('');
    setSubject('');
    setMessage('');
  }

  useEffect(() => {
    if (identity) {
      setLoading(false);
    }
  }, [identity]);

  function onSendHandler(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    send()
      .then(() => {
        dispatch(
          uiActions.showNotification({
            status: uiConstants.NotifactionStatuses.SUCCESS,
            message: 'Email sent successfully.',
          })
        );
        cleanForm();
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        let message = 'Something went wrong, try again later.';
        if (error === ERRORS.INVALID_RECIPIENT) {
          message = 'Invalid Recipient';
        }
        dispatch(
          uiActions.showNotification({
            status: uiConstants.NotifactionStatuses.ERROR,
            message,
          })
        );
        setLoading(false);
      });
  }

  async function send() {
    const [owner, publicKey] = await Promise.all([
      IdentityService.identityToOwner(toIdentity),
      IdentityService.publicKeyByIdentity(toIdentity),
    ]);

    if (owner === CONSTANTS.AddressZero) {
      throw ERRORS.INVALID_RECIPIENT;
    }

    const { encryptedMessage, encryptedSymmetricObjJSON } = await WalletService.encryptData(
      publicKey,
      JSON.stringify({
        subject,
        message,
      })
    );

    const storedEncryptedMessageId = await StorageService.putString(encryptedMessage);

    await ContractService.sendContract({
      contract: 'PointEmail',
      method: 'send',
      params: [owner, storedEncryptedMessageId, encryptedSymmetricObjJSON],
    });
  }

  return (
    <div className="container px-6 mx-auto grid">
      <h2 className="my-3 text-gray-700 dark:text-gray-200">
        <div className="text-2xl font-semibold">Compose</div>
        <div>From: @{identity}</div>
      </h2>
      <form
        onSubmit={onSendHandler}
        className="px-4 py-3 mb-8 bg-white rounded-lg shadow-md dark:bg-gray-800"
      >
        <label className="block text-sm">
          <span className="text-gray-700 dark:text-gray-400">To</span>
          <div className="relative text-gray-500 focus-within:text-green-600 dark:focus-within:text-green-400">
            <input
              disabled={!!loading}
              required={true}
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
                focus:border-green-400
                focus:outline-nonemb-5
                focus:shadow-outline-green
                dark:focus:shadow-outline-gray
                form-input
              "
              value={toIdentity}
              onChange={toIdentityChangedHandler}
              placeholder="Email Recipient Identity"
            />
            <div className="absolute inset-y-0 flex items-center ml-3 pointer-events-none">
              <UserIcon className="w-5 h-6" />
            </div>
          </div>
        </label>

        <label className="block text-sm">
          <span className="text-gray-700 dark:text-gray-400">Subject</span>
          <div className="relative text-gray-500 focus-within:text-green-600 dark:focus-within:text-green-400">
            <input
              disabled={!!loading}
              required={true}
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
                focus:border-green-400
                focus:outline-none
                focus:shadow-outline-green
                dark:focus:shadow-outline-gray
                form-input
              "
              placeholder="Email Subject"
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
            disabled={!!loading}
            required={true}
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
              focus:border-green-400 
              focus:outline-none 
              focus:shadow-outline-green 
              dark:focus:shadow-outline-gray
            "
            rows={10}
            placeholder="Email message."
            value={message}
            onChange={messageChangedHandler}
          ></textarea>
        </label>
        <button
          type="submit"
          disabled={!!loading}
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
          {loading ? (
            <>
              <Spinner className="w-5 h-5 mr-2" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <UploadIcon className="w-5 h-5 mr-2" />
              <span>Encrypt & Send Email</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Compose;
