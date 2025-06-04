import { Button, including, HTML, Selection, Select, TextArea } from '../../../../interactors';

const rootForm = HTML({ className: including('holdingsForm-') });
const paneFooter = rootForm.find(HTML({ className: including('paneFooter-') }));
const sourceValues = {
  folio: 'f32d531e-df79-46b3-8932-cdd35f7a2264',
};

export default {
  fillRequiredFields: (permanentLocation = 'Annex (KU/CC/DI/A) Remote') => {
    cy.do(Selection('Permanent*').choose(permanentLocation));
  },
  fillRequiredFieldsForTemporaryLocation: (temporaryLocation = 'Annex (KU/CC/DI/A) Remote') => {
    cy.do(Selection('Temporary').choose(temporaryLocation));
  },
  saveAndClose: () => {
    cy.do(paneFooter.find(Button('Save & close')).click());
  },
  waitLoading: () => {
    cy.expect(rootForm.exists());
  },
  checkSource: (expectedSource = sourceValues.folio) => {
    cy.expect(Select('Source').has({ value: expectedSource }));
  },
  fillPermanentLocation: (permanentLocation) => {
    cy.do(Selection('Permanent*').choose(permanentLocation));
  },
  fillCallNumber: (callNumber) => {
    cy.do(TextArea({ name: 'callNumber' }).fillIn(callNumber));
  },
  fillCallNumberSuffix: (callNumberSuffix) => {
    cy.do(TextArea({ name: 'callNumberSuffix' }).fillIn(callNumberSuffix));
  },
};
