import {
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  Modal,
  Dropdown,
  Button,
  TextArea,
} from '../../../../../interactors';
import { ITEM_STATUSES } from '../../../constants';

const LOANS_HISTORY_LIST_ID = 'list-loanshistory';
const DECLARE_LOST_MODAL_TITLE = 'Confirm item status: Declared lost';
const DECLARE_LOST_ACTION_NAME = 'Declare lost';
const LoanHistoryList = MultiColumnList(LOANS_HISTORY_LIST_ID);
const DeclareLostModal = Modal(DECLARE_LOST_MODAL_TITLE);

export default {
  getApi(userId) {
    return cy.okapiRequest({
      method: 'GET',
      path: 'circulation/loans',
      searchParams: {
        query: `userId==${userId}`
      },
    }).then(({ body }) => body.loans);
  },
  checkStatus(row, status) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-itemstatus' }).index()).then((columnIndex) => {
      cy.expect(
        LoanHistoryList
          .find(
            MultiColumnListCell(status, { row, columnIndex })
          )
          .exists()
      );
    });
  },
  checkStatusCheckedOut(row) {
    this.checkStatus(row, ITEM_STATUSES.CHECKED_OUT);
  },
  checkStatusDeclaredLost(row) {
    this.checkStatus(row, ITEM_STATUSES.DECLARED_LOST);
  },
  startDeclareLost(row) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-10' }).index()).then((columnIndex) => {
      cy.do(
        LoanHistoryList
          .find(
            MultiColumnListCell({ row, columnIndex })
          )
          .find(Dropdown('Action'))
          .choose(DECLARE_LOST_ACTION_NAME)
      );
    });
  },
  cancelDeclareLost() {
    cy.do(
      DeclareLostModal
        .find(Button('Cancel'))
        .click()
    );

    this.checkDeclareLostModalAbsent();
  },
  checkDeclareLostModalAbsent() {
    cy.expect(DeclareLostModal.absent());
  },
  finishDeclareLost(additionalInformation) {
    cy.do([
      DeclareLostModal
        .find(TextArea('Additional information*'))
        .fillIn(additionalInformation),
      DeclareLostModal
        .find(Button('Confirm'))
        .click(),
    ]);

    this.checkDeclareLostModalAbsent();
  }
};
