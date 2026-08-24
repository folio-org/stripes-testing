import { REQUEST_METHOD } from '../../constants';
import getRandomPostfix from '../../utils/stringTools';
import {
  MultiColumnListCell,
  Section,
  MultiColumnList,
  Button,
  Pane,
} from '../../../../interactors';

const rootSection = Section({ id: 'agreements-tab-pane' });
const agreementLinesList = rootSection.find(MultiColumnList());
const agreementLinesToggleButton = Button({ id: 'clickable-nav-agreementLines' });
const filterPane = Pane({ id: 'agreements-tab-filter-pane' });

const defaultAgreementLine = (agreementId) => {
  return {
    type: 'detached',
    description: `AT_AgreementLineDescription_${getRandomPostfix()}`,
    owner: agreementId,
  };
};

export default {
  defaultAgreementLine,

  navigate() {
    cy.visit('/erm/agreements');
    cy.do(agreementLinesToggleButton.click());
  },

  waitLoading() {
    cy.expect(filterPane.exists());
    cy.expect(rootSection.exists());
  },

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

  checkAgreementLineFound(agreementLineDescription, { isFound = true } = {}) {
    const targetCell = rootSection.find(MultiColumnListCell({ content: agreementLineDescription }));
    if (isFound) cy.expect(targetCell.exists());
    else cy.expect(targetCell.absent());
  },

  verifyAgreementLinesCount(itemCount) {
    if (itemCount === 0) {
      cy.expect(agreementLinesList.absent());
    } else {
      cy.expect(agreementLinesList.has({ rowCount: itemCount }));
    }
  },

  selectRecord: (agreementLine) => {
    cy.expect(agreementLinesList.find(MultiColumnListCell(agreementLine)).exists());
    cy.do(agreementLinesList.find(MultiColumnListCell(agreementLine)).click());
  },

  /* INTERCEPTORS */
  interceptGetEntitlements() {
    return cy.intercept('GET', '/erm/entitlements**').as('waiterForGetEntitlements');
  },
  waitForGetEntitlements() {
    return cy.wait('@waiterForGetEntitlements');
  },
};
