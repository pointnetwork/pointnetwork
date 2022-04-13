import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import dayjs from 'dayjs';

import * as ContractService from '@services/ContractService';

import EmailMapper from '@mappers/Email';

import { actions as uiActions } from '@store/modules/ui';

import RedirectWithTimeout from '@components/RedirectWithTimeout';
import Spinner from '@components/Spinner';

const Show: React.FC<{}> = () => {
  const [emailData, setEmailData] = useState<any>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<boolean>(true);

  const messageId = searchParams.get('id');

  const dispatch = useDispatch();

  async function getEmailData(messageId: string) {
    const rawEmail: EmailInputData = await ContractService.callContract({
      contract: 'PointEmail',
      method: 'getMessageById',
      params: [messageId],
    });

    const email = await EmailMapper(rawEmail);
    console.log(email);
    return email;
  }

  useEffect(() => {
    if (!messageId) {
      dispatch(
        uiActions.showErrorNotification({
          message: 'The message id is invalid',
        })
      );
      return;
    }

    getEmailData(messageId)
      .then((emailData) => {
        setEmailData(emailData);
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
  }, [messageId]);

  return (
    <>
      {!messageId ? (
        <RedirectWithTimeout to="/" timeout={3000} />
      ) : loading ? (
        <div className="container w-full p-10 flex flex-col items-center">
          <Spinner className="w-8 h-8" />
          <p className="mt-2">Loading message</p>
          <p className="font-bold">#{messageId}</p>
        </div>
      ) : (
        <div className="container px-6 mx-auto grid">
          <h2 className="my-3 text-gray-700 dark:text-gray-200">
            <div className="text-2xl font-semibold mb-5">
              Message from @{emailData.fromIdentity}
            </div>
            <div className="mb-5">Message Id: @{emailData.encryptedMessageId}</div>
            <div className="mb-5">Time: {dayjs(emailData.createdAt).format('MMMM DD, hh:mm')}</div>
            {emailData?.subject && <div className="mb-5">Subject: {emailData.subject}</div>}
          </h2>
          <div
            className="
              px-10
              py-10
              mb-8
              bg-white
              rounded-lg
              shadow-md
              dark:bg-gray-800
            "
          >
            {emailData.message}
          </div>
        </div>
      )}
    </>
  );
};

export default Show;
