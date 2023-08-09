import { matching } from 'bigtest';
import {
  Button,
  Pane,
  KeyValue,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
  CheckboxInTable,
  DropdownMenu,
  PaneHeader
} from '../../../../interactors';
import ConfirmItemStatusModal from '../users/loans/confirmItemStatusModal';

const claimReturnedButton = Button('Claim returned');
const changeDueDateButton = Button('Change due date');
const resolveClaimButton = Button('Resolve claim');
const markAsMissingButton = Button('Mark as missing');

export default {
  waitLoading: () => {
    cy.expect(PaneHeader({ id: 'paneHeaderpane-loandetails' }).exists());
  },
  verifyFileName(actualName) {
    expect(actualName).to.match(/^cypress\/downloads\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d+_\d+-\d+_package\.csv$/);
  },
  checkAll() {
    cy.do(CheckboxInTable({ name: 'check-all' }).click());
  },
  exportLoansToCSV() {
    cy.do(Button('Export to CSV').click());
  },
  openChangeDueDateForm() {
    cy.do([
      Button({ icon: 'ellipsis' }).click(),
      DropdownMenu().find(changeDueDateButton).click(),
    ]);
  },
  openChangeDueDate() {
    cy.do(changeDueDateButton.click());
  },
  claimReturnedAndConfirm(reasonWhyItemChangesStatus) {
    this.claimReturned();
    return ConfirmItemStatusModal.confirmItemStatus(reasonWhyItemChangesStatus);
  },
  resolveClaimedIsVisible() {
    return cy.expect(Button('Resolve claim').exists());
  },
  claimReturned() {
    return cy.do(claimReturnedButton.click());
  },
  claimReturnedButtonIsVisible() {
    return cy.expect(claimReturnedButton.exists());
  },
  claimReturnedButtonIsDisabled() {
    return cy.expect(claimReturnedButton.absent());
  },
  renewLoan() {
    cy.do([
      Button({ icon: 'ellipsis' }).click(),
      Button('Renew').click(),
    ]);
  },
  renewalMessageCheck(message) {
    this.renewLoan();
    cy.contains(message).should('be.visible');
  },
  checkOverrideButtonHidden() {
    cy.expect(Button('Override').absent());
  },
  checkOverrideButtonVisible() {
    cy.expect(Button('Override').exists());
  },
  dismissPane() {
    return cy.do(Pane(including('Loan details')).dismiss());
  },
  closePage() {
    cy.do(Pane({ id: 'pane-loanshistory' }).find(Button({ ariaLabel: 'Close ' })).click());
  },
  checkLoanPolicy(policyName) {
    cy.contains(policyName).should('be.visible');
  },
  checkItemStatus(itemStatus) {
    cy.expect(KeyValue('Item status', { value: itemStatus }).exists());
  },
  checkClaimReturnedDateTime() {
    cy.expect(KeyValue('Claimed returned', { value: matching(/\d{1,2}:\d{2}\s\w{2}/gm) }).exists());
  },
  verifyExportFileName(actualName) {
    const expectedFileNameMask = /export\.csv/gm;//
    expect(actualName).to.match(expectedFileNameMask);
  },
  verifyContentOfExportFileName(actual, ...expectedArray) {
    expectedArray.forEach(expectedItem => (expect(actual).to.include(expectedItem)));
  },
  verifyResultsInTheRow: (allContentToCheck, rowIndex = 0) => {
    return allContentToCheck.forEach(contentToCheck => cy.expect(MultiColumnListRow({ indexRow: `row-${rowIndex}` }).find(MultiColumnListCell({ content: including(contentToCheck) })).exists()));
  },
  markItemAsMissing: (barcode, reasonWhyItemChangesStatus) => {
    cy.do([
      MultiColumnListCell({ content: including(barcode) }).click(),
      resolveClaimButton.click(),
      markAsMissingButton.click(),
    ]);
    ConfirmItemStatusModal.confirmItemStatus(reasonWhyItemChangesStatus);
  },
};
