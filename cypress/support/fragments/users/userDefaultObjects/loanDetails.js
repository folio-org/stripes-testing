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
import { ITEM_STATUS_NAMES } from '../../../constants';
import DateTools from '../../../utils/dateTools';
import { getFullName } from '../../../utils/users';
import FeeFinesDetails from '../feeFineDetails';
import PayFeeFaine from '../payFeeFaine';

const DECLARE_LOST_MODAL_TITLE = 'Confirm item status: Declared lost';
const DeclareLostButton = Button('Declare lost');
const AnonymizeAllButton = Button('Anonymize all loans');
const ActionButton = Button({ ariaLabel: 'Action' });
const NewFeeFineButton = Button('New fee/fine');
const DeclareLostModal = Modal(DECLARE_LOST_MODAL_TITLE);
const AnonymizeAllLoansModal = Modal('Anonymize all loans?');
const AnonymizeModal = Modal('Anonymization prevented');
const LoanActionsList = MultiColumnList({ id: 'list-loanactions' });

const checkDeclareLostButtonActivity = (disabled) => {
  cy.expect(DeclareLostButton.has({ disabled }));
};

export default {
  waitLoading: () => {
    cy.expect(Pane({ id: 'pane-loanshistory' }).exists());
  },
  checkDeclareLostButtonDisabled() {
    checkDeclareLostButtonActivity(true);
  },
  checkDeclareLostButtonActive() {
    checkDeclareLostButtonActivity(false);
  },
  startDeclareLost() {
    cy.do(DeclareLostButton.click());
  },
  finishDeclareLost(additionalInformation) {
    cy.do([
      DeclareLostModal.find(TextArea('Additional information*')).fillIn(additionalInformation),
      DeclareLostModal.find(Button('Confirm')).click(),
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
    cy.wait(1000);
    this.checkKeyValue('Renewal count', '1');
  },
  checkStatusDeclaredLost() {
    this.checkStatus(ITEM_STATUS_NAMES.DECLARED_LOST);
  },
  checkStatusCheckedOut() {
    this.checkStatus(ITEM_STATUS_NAMES.CHECKED_OUT);
  },
  checkStatusInList(row, status) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-itemstatus' }).index()).then(
      (columnIndex) => {
        cy.expect(LoanActionsList.find(MultiColumnListCell(status, { row, columnIndex })).exists());
      },
    );
  },
  checkStatusDeclaredLostInList(row) {
    this.checkStatusInList(row, ITEM_STATUS_NAMES.DECLARED_LOST);
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
  checkAnonymizeAllLoansModalOpen() {
    cy.expect(AnonymizeAllLoansModal.exists());
  },
  confirmAnonymizeAllLoans() {
    cy.do(AnonymizeAllLoansModal.find(Button('Confirm')).click());
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
    cy.then(() => MultiColumnListHeader({ id: 'list-column-action' }).index()).then(
      (columnIndex) => {
        cy.expect(LoanActionsList.find(MultiColumnListCell(action, { row, columnIndex })).exists());
      },
    );
  },
  checkActionDueDate(row, actionDueDate) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-duedate' }).index()).then(
      (columnIndex) => {
        cy.expect(
          LoanActionsList.find(
            MultiColumnListCell(DateTools.getFormattedEndDateWithTime(actionDueDate), {
              row,
              columnIndex,
            }),
          ).exists(),
        );
      },
    );
  },
  checkDateValid(date) {
    // TODO: clarify the reason of eslint warning
    // eslint-disable-next-line no-unused-expressions
    expect(moment(date).isValid()).to.be.true;
  },
  checkActionDate(row, actionDate) {
    this.checkDateValid(actionDate);

    cy.then(() => MultiColumnListHeader({ id: 'list-column-actiondate' }).index()).then(
      (columnIndex) => {
        cy.expect(
          LoanActionsList.find(
            MultiColumnListCell(DateTools.getFormattedDateWithTime(actionDate), {
              row,
              columnIndex,
            }),
          ).exists(),
        );
      },
    );
  },
  checkActionDeclaredLost(row) {
    this.checkAction(row, ITEM_STATUS_NAMES.DECLARED_LOST);
  },
  checkDueDate(row, dueDate) {
    this.checkDateValid(dueDate);

    const expectedDueDate = DateTools.getFormattedDateWithTime(dueDate);

    cy.then(() => MultiColumnListHeader({ id: 'list-column-duedate' }).index()).then(
      (columnIndex) => {
        cy.expect(
          LoanActionsList.find(MultiColumnListCell(expectedDueDate, { row, columnIndex })).exists(),
        );
      },
    );
  },
  checkLoanDetails({ action, dueDate, status, source, comment }) {
    this.checkAction(0, action);
    this.checkDueDate(0, dueDate);
    this.checkStatusInList(0, status);
    this.checkSource(0, source);
    this.checkComments(0, comment);
  },
  checkLoansActionsHaveSameDueDate(firstRow, secondRow, dueDate) {
    this.checkDateValid(dueDate);

    const expectedDueDate = DateTools.getFormattedDateWithTime(dueDate);

    cy.then(() => MultiColumnListHeader({ id: 'list-column-duedate' }).index()).then(
      (columnIndex) => {
        cy.expect(
          LoanActionsList.find(
            MultiColumnListCell(expectedDueDate, { row: firstRow, columnIndex }),
          ).exists(),
        );
        cy.expect(
          LoanActionsList.find(
            MultiColumnListCell(expectedDueDate, { row: secondRow, columnIndex }),
          ).exists(),
        );
      },
    );
  },
  checkSource(row, source) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-source' }).index()).then(
      (columnIndex) => {
        if (typeof source === 'string') {
          cy.expect(
            LoanActionsList.find(
              MultiColumnListCell(including(source), { row, columnIndex }),
            ).exists(),
          );
        } else {
          cy.expect(
            LoanActionsList.find(
              MultiColumnListCell({
                row,
                columnIndex,
              }),
            )
              .find(Link(getFullName(source), { href: including(`/users/view/${source.id}`) }))
              .exists(),
          );
        }
      },
    );
  },
  checkComments(row, comment) {
    cy.then(() => MultiColumnListHeader({ id: 'list-column-comments' }).index()).then(
      (columnIndex) => {
        cy.expect(
          LoanActionsList.find(MultiColumnListCell(comment, { row, columnIndex })).exists(),
        );
      },
    );
  },
  openFeeFine(amount) {
    cy.do(Button({ className: including('feefineButton-') }, including(amount)).click());
  },
  declareItemLost(comment) {
    this.checkAction(0, 'Checked out');
    this.startDeclareLost();
    this.finishDeclareLost(comment);
  },
  checkLoanClosed() {
    this.checkAction(0, 'Closed loan');
    this.checkStatusInList(0, 'Lost and paid');
    this.checkSource(0, 'System');
    this.checkComments(0, '-');
  },
  payFeeFine(amount, paymentMethod) {
    FeeFinesDetails.openActions().then(() => {
      FeeFinesDetails.openPayModal();
    });
    PayFeeFaine.checkAmount(amount);
    PayFeeFaine.setPaymentMethod(paymentMethod);
    PayFeeFaine.setAmount(amount);
    PayFeeFaine.checkRestOfPay(amount);
    PayFeeFaine.submitAndConfirm();
  },
};
