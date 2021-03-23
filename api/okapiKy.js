import ky from 'ky';
import localforage from 'localforage';

const config = {
  tenant: 'diku',
  url: 'https://folio-snapshot-okapi.dev.folio.org',
};

export default async () => {
  const okapiSess = await localforage.getItem('okapiSess');

  return ky.create({
    prefixUrl: config.url,
    hooks: {
      beforeRequest: [
        request => {
          request.headers.set('X-Okapi-Tenant', config.tenant);
          request.headers.set('X-Okapi-Token', okapiSess.token);
        }
      ]
    },
    retry: 0
  });
};
