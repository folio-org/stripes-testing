import { HTML, including } from '@interactors/html';
import { Button, Select, Selection, TextArea, TextField } from '../../../../interactors';

const rootForm = HTML({ className: including('holdingsForm-') });
const footerPane = HTML({ className: including('paneFooter-') });
const saveAndCloseButton = footerPane.find(Button({ id: 'clickable-create-holdings-record' }));
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
    cy.do(saveAndCloseButton.click());
    cy.expect(rootForm.absent());
  },
  waitLoading: () => {
    cy.expect(rootForm.exists());
  },
  checkSource: (expectedSource = sourceValues.folio) => {
    cy.expect(Select('Source').has({ value: expectedSource }));
  },
  fillPermanentLocation: (permanentLocation) => {
    cy.do(Selection('Permanent*').choose(including(permanentLocation)));
  },
  fillCallNumber: (callNumber) => {
    cy.do(TextArea({ name: 'callNumber' }).fillIn(callNumber));
  },
  fillCopyNumber: (copyNumber) => {
    cy.do(TextField({ name: 'copyNumber' }).fillIn(copyNumber));
  },
  fillCallNumberSuffix: (callNumberSuffix) => {
    cy.do(TextArea({ name: 'callNumberSuffix' }).fillIn(callNumberSuffix));
  },
  close: () => {
    cy.do(Button({ icon: 'times' }).click());
    cy.expect(rootForm.absent());
  },
};
