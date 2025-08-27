import { Button, PaneHeader } from '../../../../interactors';

export default {
  // open new publication request page
  openNewPublicationRequest: () => {
    cy.do([Button('Actions').click(), Button('New').click()]);
    // check title is displayed
    cy.expect(PaneHeader({ title: 'New publication request' }).exists());
  },
};
