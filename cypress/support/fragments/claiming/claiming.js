import { Button, HTML, Pane, PaneHeader } from '../../../../interactors';

const claimingPane = Pane('Claiming');
const actionsButton = Button('Actions');

export default {
  waitLoading() {
    cy.expect([claimingPane.exists()]);
    cy.wait(2000);
  },

  checkClaimingPaneIsDisplayed() {
    cy.expect(claimingPane.exists());
  },

  expandActionsDropdown() {
    cy.do(claimingPane.find(PaneHeader()).find(actionsButton).click());
  },

  checkActionsMenuOptionExists(optionName, exists = true) {
    if (exists) {
      cy.expect(Button(optionName).exists());
    } else {
      cy.expect(Button(optionName).absent());
    }
  },

  verifyMessageDisplayed(message) {
    cy.expect(claimingPane.find(HTML(message)).exists());
  },

  verifyRecordsCountInSubheader(count = 0) {
    cy.expect(
      claimingPane
        .find(PaneHeader())
        .find(HTML(`${count} records found`))
        .exists(),
    );
  },
};
