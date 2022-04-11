const windowWithPoint = window as unknown as WindowWithPoint;

export async function encryptData(publicKey: PublicKey, data: string): Promise<EncryptedData> {
  const {
    data: { encryptedMessage, encryptedSymmetricObj, encryptedSymmetricObjJSON },
  } = await windowWithPoint.point.wallet.encryptData({ publicKey, data });

  return {
    encryptedMessage,
    encryptedSymmetricObj,
    encryptedSymmetricObjJSON,
  };
}

export async function decryptData(
  encryptedData: string,
  encryptedSymmetricObj: any
): Promise<string> {
  const {
    data: { decryptedData },
  } = await windowWithPoint.point.wallet.decryptData({
    encryptedData,
    encryptedSymmetricObj,
  });
  return decryptedData;
}

export async function getAddress(): Promise<Address> {
  const {
    data: { address },
  } = await windowWithPoint.point.wallet.address();
  return address;
}
