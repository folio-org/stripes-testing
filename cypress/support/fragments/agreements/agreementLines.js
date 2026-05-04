import { REQUEST_METHOD } from '../../constants';
import getRandomPostfix from '../../utils/stringTools';
import { MultiColumnListCell, Section, MultiColumnList, Button } from '../../../../interactors';

const rootSection = Section({ id: 'agreements-tab-pane' });
const agreementLinesList = rootSection.find(MultiColumnList());
const agreementLinesToggleButton = Button({ id: 'clickable-nav-agreementLines' });
const selectAgreementsButton = Button({ id: 'agreement-agreement-search-button' });

const defaultAgreementLine = (agreementId) => {
  return {
    type: 'detached',
    description: `AT_AgreementLineDescription_${getRandomPostfix()}`,
    owner: agreementId,
  };
};

export default {
  defaultAgreementLine,

  waitLoading() {
    cy.expect(rootSection.exists());
    cy.do(
      agreementLinesToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
    cy.expect(selectAgreementsButton.exists());
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
};
