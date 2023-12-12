import { PaneHeader, Section, including } from '../../../../../interactors';

const groupDetailsPane = Section({ id: 'pane-group-details' });

const groupDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-group-details' });

export default {
  waitLoading() {
    cy.expect(groupDetailsPane.exists());
  },

  verifyGroupName: (title) => {
    cy.expect(groupDetailsPane.find(groupDetailsPaneHeader).has({ text: including(title) }));
  },
};
