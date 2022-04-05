export const shortAddress = (address: string) =>
  address.substring(0, 5) + "..." + address.substring(address.length - 5);
