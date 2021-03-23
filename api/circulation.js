import uuid from 'uuid';

import okapiKy from './okapiKy';

export const createCheckout = async (checkout) => {
  const ky = await okapiKy();
  const checkoutId = uuid();

  await ky.post('circulation/check-out-by-barcode', {
    json: {
      id: checkoutId,
      ...checkout,
    },
  });

  return checkoutId;
};
