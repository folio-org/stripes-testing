import { Button, including, HTML, Selection, Select } from '../../../../interactors';

const rootForm = HTML({ className: including('holdingsForm-') });
const sourceValues = {
  folio:'f32d531e-df79-46b3-8932-cdd35f7a2264'
};

export default {
  fillRequiredFields : () => {
    cy.do(Selection('Permanent*').choose('Annex (KU/CC/DI/A) Remote'));
  },
  saveAndClose : () => {
    cy.do(rootForm.find(Button('Save and close')).click());
    cy.expect(rootForm.absent());
  },
  waitLoading: () => {
    cy.expect(rootForm.exists());
  },
  checkSource:(expectedSource = sourceValues.folio) => {
    cy.expect(Select('Source').has({ value:expectedSource }));
  }
};
