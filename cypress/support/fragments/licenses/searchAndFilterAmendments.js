import { Accordion, Pane } from '../../../../interactors';

const amendmentsFilterPane = Pane({ id: 'pane-license-filters' });
const acquisitionUnitsFilterAccordion = amendmentsFilterPane.find(Accordion('Acquisition unit'));

export default {
  verifyAcquisitionUnitsFilterPresent() {
    cy.expect(acquisitionUnitsFilterAccordion.exists());
  },
};
