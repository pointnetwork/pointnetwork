import * as IdentityService from '@services/IdentityService';
import * as StorageService from '@services/StorageService';
import * as WalletService from '@services/WalletService';
import * as ContractService from '@services/ContractService';

export default async function EmailMapper(inputData: EmailInputData): Promise<any> {
  const [id, from, to, encryptedMessageId, encryptedSymmetricObj, createdAt] = inputData;
  const [fromIdentity, toIdentity, encryptedData, metadata] = await Promise.all([
    IdentityService.ownerToIdentity(from),
    IdentityService.ownerToIdentity(from),
    StorageService.getString(encryptedMessageId),
    ContractService.callContract({
      contract: 'PointEmail',
      method: 'getMetadata',
      params: [encryptedMessageId],
    }),
  ]);

  const decryptedMessage = await WalletService.decryptData(encryptedData, encryptedSymmetricObj);

  const [important, deleted] = metadata;

  let message;
  let subject;

  try {
    const json = JSON.parse(decryptedMessage);
    message = json.message;
    subject = json.subject;
  } catch (error) {}

  return {
    id,
    from,
    fromIdentity,
    to,
    toIdentity,
    encryptedMessageId,
    encryptedSymmetricObj,
    createdAt: createdAt * 1000,
    subject,
    message,
    important,
    deleted,
  };
}
