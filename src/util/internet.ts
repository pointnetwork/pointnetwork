export const areWeOnline = async (): Promise<boolean> => Boolean(await (require('dns').promises.resolve('google-public-dns-a.google.com').catch(()=>{})));