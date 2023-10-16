import { REQUEST_METHOD } from '../../constants';
import { randomFourDigitNumber } from '../../utils/stringTools';
import { MultiColumnListCell, Section, MultiColumnList } from '../../../../interactors';

const rootSection = Section({ id: 'agreements-tab-pane' });
const agreementLinesList = rootSection.find(MultiColumnList());

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

  getIdViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.GET,
        path: 'erm/entitlements',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body[0].id;
      });
  },

  agreementLinesListClick(agreementLineName) {
    cy.do(MultiColumnListCell(agreementLineName).click());
  },

  verifyAgreementLinesCount(itemCount) {
    if (itemCount === 0) {
      cy.expect(agreementLinesList.absent());
    } else {
      cy.expect(agreementLinesList.has({ rowCount: itemCount }));
    }
  },
};
