const windowWithPoint = window as unknown as WindowWithPoint;

type Owner = string;
type Identity = string;
type PublicKey = string;

export async function identityToOwner(identity: Identity): Promise<Owner> {
  const {
    data: { owner },
  } = await windowWithPoint.point.identity.identityToOwner({
    identity,
  });

  return owner;
}

export async function publicKeyByIdentity(identity: Identity): Promise<PublicKey> {
  const {
    data: { publicKey },
  } = await windowWithPoint.point.identity.publicKeyByIdentity({
    identity,
  });

  return publicKey;
}

export async function ownerToIdentity(address: Address): Promise<Identity> {
  const {
    data: { identity },
  } = await windowWithPoint.point.identity.ownerToIdentity({ owner: address });
  return identity;
}
