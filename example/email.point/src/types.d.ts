type TodoItem = {
  id: number;
  owner: string;
  text: string;
  deleted: boolean;
  completed: boolean;
};

type WindowWithPoint = Window & {
  point: any;
};

type PublicKey = string;

type EncryptedData = {
  encryptedMessage: string;
  encryptedSymmetricObj: Object;
  encryptedSymmetricObjJSON: string;
};

type Address = string;

type Identity = string;
