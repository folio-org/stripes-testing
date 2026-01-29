import {
  Button,
  Checkbox,
  HTML,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  Pane,
  PaneHeader,
  TextField,
  including,
  SearchField,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';

const claimingPane = Pane('Claiming');
const actionsButton = Button('Actions');
const claimingList = MultiColumnList({ id: 'claiming-list' });
const sendClaimModal = Modal('Send claim');
const searchField = SearchField();

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

  verifyPiecesCount(count) {
    const recordText = count === 1 ? 'record found' : 'records found';
    cy.expect(claimingPane.find(HTML(including(`${count} ${recordText}`))).exists());
  },

  selectPieceByRowIndex(rowIndex = 0) {
    cy.do(
      claimingList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Checkbox())
        .click(),
    );
  },

  clickActionsButton() {
    cy.do(claimingPane.find(PaneHeader()).find(actionsButton).click());
  },

  clickSendClaimOption() {
    cy.do(Button('Send claim').click());
  },

  fillClaimExpiryDate(date) {
    cy.do(sendClaimModal.find(TextField({ name: including('claimingDate') })).fillIn(date));
  },

  clickSaveAndCloseInSendClaimModal() {
    cy.do(sendClaimModal.find(Button('Save & close')).click());
  },

  sendClaim() {
    const futureDate = DateTools.getFutureWeekDateObj();
    const formattedDate = DateTools.getFormattedDate({ date: futureDate }, 'MM/DD/YYYY');

    this.clickActionsButton();
    this.clickSendClaimOption();
    this.fillClaimExpiryDate(formattedDate);
    this.clickSaveAndCloseInSendClaimModal();
  },

  searchByTitle(title) {
    cy.do([searchField.fillIn(title), Button('Search').click()]);
    cy.wait(2000);
  },

  verifyPiecesWithTitleDisplayed(title, expectedCount) {
    cy.expect(claimingList.find(HTML(including(title))).exists());
    cy.then(() => claimingList.rowCount()).then((actualCount) => {
      expect(actualCount).to.equal(
        expectedCount,
        `Expected ${expectedCount} pieces after searching for "${title}", but found ${actualCount}`,
      );
    });
  },
};
