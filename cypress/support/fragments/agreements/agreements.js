import { Button, MultiColumnListCell, MultiColumnListRow, Section, or, including, HTML } from '../../../../interactors';
import NewAgreement from './newAgreement';

const section = Section({ id: 'pane-agreement-list' });
const newButton = Button('New');
const waitLoading = () => {
  cy.expect(or(
    section.find(MultiColumnListRow()).exists(),
    section.find(HTML(including('No results found. Please check your filters.'))).exists()
  ));
};
const defaultApiAgreement = {
  'periods': [{ 'startDate': '2022-07-26' }], // TODO: change to today date
  'customProperties': {
    'AuthorIdentification': [{ '_delete': true }],
    'Eligible authors': [{ '_delete': true }]
  },
  'agreementStatus': 'draft',
  'outwardRelationships': [],
  'inwardRelationships': []
};

export default {
  waitLoading,

  create: (specialAgreement = NewAgreement.defaultAgreement) => {
    cy.do(newButton.click());
    NewAgreement.waitLoading();
    NewAgreement.fill(specialAgreement);
    NewAgreement.save();
  },

  selectRecord: (agreementTitle) => {
    cy.do(section.find(MultiColumnListCell(agreementTitle)).click());
  },

  agreementNotVisible: (agreementTitle) => cy.expect(section.find(MultiColumnListCell(agreementTitle)).absent()),

  createViaApi(agreementName) {
    return cy
      .okapiRequest({
        path: 'erm/sas',
        method: 'POST',
        body: { ...defaultApiAgreement, name: agreementName },
        isDefaultSearchParamsRequired: false,
      });
  },

  deleteViaApi(agreementId) {
    return cy
      .okapiRequest({
        path: `erm/sas/${agreementId}`,
        method: 'DELETE',
        isDefaultSearchParamsRequired: false,
      });
  }
};

