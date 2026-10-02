import { Button, Pane } from '../../../../interactors';

const amendmentsToggleButton = Button({ id: 'clickable-nav-amendments' });
const rootSection = Pane({ titleLabel: 'Amendments' });

export default {
  openAmendmentsTab() {
    cy.do(amendmentsToggleButton.click());
  },

  waitLoading() {
    cy.expect(rootSection.exists());
  },
};
