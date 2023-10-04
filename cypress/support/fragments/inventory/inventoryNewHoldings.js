import { Button, including, HTML, Selection, Select } from '../../../../interactors';

const rootForm = HTML({ className: including('holdingsForm-') });
const sourceValues = {
  folio: 'f32d531e-df79-46b3-8932-cdd35f7a2264',
};

export default {
  fillRequiredFields: (permanentLocation = 'Annex (KU/CC/DI/A) Remote') => {
    cy.do(Selection('Permanent*').choose(permanentLocation));
  },
  saveAndClose: () => {
    cy.do(rootForm.find(Button('Save & close')).click());
    cy.expect(rootForm.absent());
  },
  waitLoading: () => {
    cy.expect(rootForm.exists());
  },
  checkSource: (expectedSource = sourceValues.folio) => {
    cy.expect(Select('Source').has({ value: expectedSource }));
  },
};
