import moment from 'moment';

import {
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Button,
  TextArea,
  KeyValue,
  Link,
  Modal,
  including,
  Select,
  TextInput,
  Pane,
} from '../../../../../interactors';
import { ITEM_STATUSES } from '../../../constants';
import DateTools from '../../../utils/dateTools';
import { getFullName } from '../../../utils/users';

const DECLARE_LOST_MODAL_TITLE = 'Confirm item status: Declared lost';
const LOAN_ACTIONS_LIST_ID = 'list-loanactions';
const DeclareLostButton = Button('Declare lost');
const AnonymizeAllButton = Button('Anonymize all loans');
const ActionButton = Button({ ariaLabel: 'Action' });
const NewFeeFineButton = Button('New fee/fine');
const DeclareLostModal = Modal(DECLARE_LOST_MODAL_TITLE);
const AnonymizeModal = Modal('Anonymization prevented');
const LoanActionsList = MultiColumnList(LOAN_ACTIONS_LIST_ID);

const checkDeclareLostButtonActivity = (disabled) => {
  cy.expect(DeclareLostButton.has({ disabled }));
};

export default {

  waitLoading:() => {
    cy.expect(Pane({ id: 'pane-loanshistory' }).exists());
  },
  checkDeclareLostButtonDisabled() {
    checkDeclareLostButtonActivity(true);
  },
  checkDeclareLostButtonActive() {
    checkDeclareLostButtonActivity(false);
  },
  startDeclareLost() {
    cy.do(
      DeclareLostButton
        .click()
    );
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
  },
  checkDeclareLostModalAbsent() {
    cy.expect(DeclareLostModal.absent());
  },
  checkKeyValue(label, value) {
    cy.expect(KeyValue(label, { value }).exists());
  },
  checkStatus(status) {
    this.checkKeyValue('Item status', status);
  },
  checkLostDate(date) {
    this.checkDateValid(date);
    this.checkKeyValue('Lost', DateTools.getFormattedDateWithTime(date));
  },
  checkRenewalCount() {
    this.checkKeyValue('Renewal count', '1');
  },
  checkStatusDeclaredLost() {
    this.checkStatus(ITEM_STATUSES.DECLARED_LOST);
  },
  checkStatusCheckedOut() {
    this.checkStatus(ITEM_STATUSES.CHECKED_OUT);
  },
  checkStatusInList(row, status) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-itemstatus' }).index()).then((columnIndex) => {
      cy.expect(
        LoanActionsList
          .find(
            MultiColumnListCell(status, { row, columnIndex })
          )
          .exists()
      );
    });
  },
  checkStatusDeclaredLostInList(row) {
    this.checkStatusInList(row, ITEM_STATUSES.DECLARED_LOST);
  },
  anonymizeAllLoans() {
    cy.do(AnonymizeAllButton.click());
  },
  createFeeFine(owner, feeFineType) {
    cy.do([
      MultiColumnList()
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 10 }))
        .find(ActionButton)
        .click(),
      NewFeeFineButton.click(),
    ]);
    cy.expect(Modal('New fee/fine').exists());
    cy.do([
      Select({ id: 'ownerId' }).choose(owner),
      Select({ id: 'feeFineType' }).choose(feeFineType),
      TextInput({ id: 'amount' }).fillIn('1'),
      Button({ id: 'chargeOnly' }).click(),
    ]);
  },
  checkAnonymizeModalOpen() {
    cy.expect(AnonymizeModal.exists());
  },
  closeAnonymizeModal() {
    cy.do(AnonymizeModal.find(Button('OK')).click());
    cy.expect(AnonymizeModal.absent());
  },
  checkLoanAbsent(title) {
    cy.expect(KeyValue(title).absent());
  },
  checkAction(row, action) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-action' }).index()).then((columnIndex) => {
      cy.expect(
        LoanActionsList
          .find(
            MultiColumnListCell(action, { row, columnIndex })
          )
          .exists()
      );
    });
  },
  checkDateValid(date) {
    // TODO: clarify the reason of eslint warning
    expect(moment(date).isValid()).to.be.true;
  },
  checkActionDate(row, actionDate) {
    this.checkDateValid(actionDate);

    cy.then(() => MultiColumnListHeader({ id: 'list-column-actiondate' }).index()).then((columnIndex) => {
      cy.expect(
        LoanActionsList
          .find(
            MultiColumnListCell(
              DateTools.getFormattedDateWithTime(actionDate),
              { row, columnIndex }
            )
          )
          .exists()
      );
    });
  },
  checkActionDeclaredLost(row) {
    this.checkAction(row, ITEM_STATUSES.DECLARED_LOST);
  },
  checkLoansActionsHaveSameDueDate(firstRow, secondRow, dueDate) {
    this.checkDateValid(dueDate);

    const expectedDueDate = DateTools.getFormattedDateWithTime(dueDate);

    cy.then(() => MultiColumnListHeader({ id: 'list-column-duedate' }).index()).then((columnIndex) => {
      cy.expect(
        LoanActionsList
          .find(
            MultiColumnListCell(
              expectedDueDate,
              { row: firstRow, columnIndex }
            )
          )
          .exists()
      );
      cy.expect(
        LoanActionsList
          .find(
            MultiColumnListCell(
              expectedDueDate,
              { row: secondRow, columnIndex }
            )
          )
          .exists()
      );
    });
  },
  checkSource(row, user) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-source' }).index()).then((columnIndex) => {
      cy.expect(
        LoanActionsList
          .find(
            MultiColumnListCell({
              row,
              columnIndex,
            })
          )
          .find(
            Link(getFullName(user), { href: including(`/users/view/${user.id}`) })
          )
          .exists()
      );
    });
  },
  checkComments(row, comment) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-comments' }).index()).then((columnIndex) => {
      cy.expect(
        LoanActionsList
          .find(
            MultiColumnListCell(comment, { row, columnIndex })
          )
          .exists()
      );
    });
  },
};
