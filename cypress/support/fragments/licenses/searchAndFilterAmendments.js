import { Accordion, Pane } from '../../../../interactors';

// TODO: confirm the real filter-pane id for Amendments against the live ui-licenses app
// (guessed as reusing the Licenses filter pane, mirroring how Agreement Lines reuses the Agreements filter pane)
const amendmentsFilterPane = Pane({ id: 'pane-license-filters' });
const acquisitionUnitsFilterAccordion = amendmentsFilterPane.find(Accordion('Acquisition units'));

export default {
  verifyAcquisitionUnitsFilterPresent() {
    cy.expect(acquisitionUnitsFilterAccordion.exists());
  },
};
