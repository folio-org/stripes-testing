import { REQUEST_METHOD } from '../constants';
import DateTools from '../utils/dateTools';
import { randomFourDigitNumber } from '../utils/stringTools';

const defaultAgreement = {
  periods: [
    {
      startDate: DateTools.getCurrentDateForFiscalYear(),
    },
  ],
  name: `AutotestAgreement' ${randomFourDigitNumber()}`,
  agreementStatus: 'active',
};

export default {
  defaultAgreement,
  createViaApi: (agreement = defaultAgreement) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'erm/sas',
        body: agreement,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },

  deleteViaApi: (agreementId) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `erm/sas/${agreementId}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  getIdViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.GET,
        path: 'erm/sas',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body[0].id;
      });
  },
};
