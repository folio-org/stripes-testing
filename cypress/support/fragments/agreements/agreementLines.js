import { REQUEST_METHOD } from '../../constants';
import { randomFourDigitNumber } from '../../utils/stringTools';

const defaultAgreementLine = (agreementId) => {
  return {
    type: 'detached',
    description: `Agreement Line Description ${randomFourDigitNumber()}`,
    owner: agreementId,
  };
};

export default {
  defaultAgreementLine,

  createViaApi: (agreementLine) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'erm/entitlements',
        body: agreementLine,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },

  deleteViaApi: ({ agreementId, agreementLineId }) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.PUT,
      path: `erm/sas/${agreementId}`,
      body: {
        id: agreementId,
        items: [
          {
            id: agreementLineId,
            _delete: true,
          },
        ],
      },
      isDefaultSearchParamsRequired: false,
    });
  },
};
