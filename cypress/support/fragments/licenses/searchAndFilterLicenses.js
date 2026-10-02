import { Accordion, Button, TextField, Pane } from '../../../../interactors';

const licensesFilterPane = Pane({ id: 'pane-license-filters' });
const acquisitionUnitsFilterAccordion = licensesFilterPane.find(Accordion('Acquisition unit'));

export default {
  search(name) {
    cy.wait(1500);
    cy.do(TextField({ id: 'input-license-search' }).fillIn(name));
    cy.do(licensesFilterPane.find(Button('Search')).click());
  },

  verifyAcquisitionUnitsFilterPresent() {
    cy.expect(acquisitionUnitsFilterAccordion.exists());
  },
};
