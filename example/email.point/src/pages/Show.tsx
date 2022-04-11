import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import * as ContractService from '@services/ContractService';
import * as StorageService from '@services/StorageService';
import * as WalletService from '@services/WalletService';
import * as IdentityService from '@services/IdentityService';

const Show: React.FC<{}> = () => {
  const [emailData, setEmailData] = useState<any>();
  const [searchParams] = useSearchParams();
  const messageId = searchParams.get('id');

  useEffect(() => {
    if (!messageId) {
      return;
    }

    (async () => {
      const [id, from, to, encryptedMessageId, encryptedSymmetricObj, createdAt]: [
        number,
        string,
        string,
        string,
        string,
        number
      ] = await ContractService.callContract({
        contract: 'PointEmail2',
        method: 'getMessageById',
        params: [messageId],
      });

      const encryptedData = await StorageService.getString(encryptedMessageId);

      const [decryptedMessage, fromIdentity, toIdentity] = await Promise.all([
        WalletService.decryptData(encryptedData, encryptedSymmetricObj),
        IdentityService.ownerToIdentity(from),
        IdentityService.ownerToIdentity(to),
      ]);

      const email = {
        id,
        from,
        fromIdentity,
        to,
        toIdentity,
        encryptedMessageId,
        encryptedSymmetricObj,
        decryptedMessage,
        createdAt,
      };

      setEmailData(email);
    })();
  }, [messageId]);

  return (
    <div className="container px-6 mx-auto grid">
      <h2 className="my-3 text-gray-700 dark:text-gray-200">
        <div className="text-2xl font-semibold">Message from @{emailData?.fromIdentity}</div>
        <div className="">Message Id: @{emailData?.id}</div>
        <div className="">Time: @{emailData?.createdAt}</div>
      </h2>
      <div
        className="
          dark:border-gray-700
          bg-gray-50
          dark:text-gray-400
          dark:bg-gray-800
        "
      >
        {emailData?.decryptedMessage}
      </div>
    </div>
  );
};

export default Show;
