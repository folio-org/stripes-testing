import { Button, Section } from '../../../../interactors';

// TODO: confirm the real nav-tab id and root section id for Amendments against the live ui-licenses app
const amendmentsToggleButton = Button({ id: 'clickable-nav-amendments' });
const rootSection = Section({ id: 'licenses-tab-pane' });

export default {
  openAmendmentsTab() {
    cy.do(amendmentsToggleButton.click());
  },

  waitLoading() {
    cy.expect(rootSection.exists());
  },
};
