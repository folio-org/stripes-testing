import { matching } from 'bigtest';
import {
  Button,
  Pane,
  KeyValue,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
  CheckboxInTable,
  Dropdown,
  DropdownMenu,
  PaneHeader,
  Link,
} from '../../../../interactors';
import ConfirmItemStatusModal from '../users/loans/confirmItemStatusModal';

const DECLARE_LOST_ACTION_NAME = 'Declare lost';
const MARK_AS_MISSING_ACTION_NAME = 'Mark as missing';

const claimReturnedButton = Button('Claim returned');
const changeDueDateButton = Button('Change due date');
const resolveClaimButton = Dropdown('Resolve claim');
const LoanDateKeyValue = KeyValue('Loan date');

export default {
  waitLoading: () => {
    cy.expect(PaneHeader({ id: 'paneHeaderpane-loandetails' }).exists());
  },
  verifyFileName(actualName) {
    expect(actualName).to.match(
      /^cypress\/downloads\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d+_\d+-\d+_package\.csv$/,
    );
  },
  checkAll() {
    cy.do(CheckboxInTable({ name: 'check-all' }).click());
  },
  checkOneLoan() {
    cy.do(MultiColumnListRow({ index: 0 }).find(CheckboxInTable()).click());
  },
  exportLoansToCSV() {
    cy.do(Button('Export to CSV').click());
  },
  openChangeDueDateForm() {
    cy.do([Button({ icon: 'ellipsis' }).click(), DropdownMenu().find(changeDueDateButton).click()]);
  },
  openChangeDueDate() {
    cy.do(changeDueDateButton.click());
  },
  verifyChangeDueDateButtonIsActive() {
    cy.expect(changeDueDateButton.is({ disabled: false }));
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
  claimResolveButtonIsAbsent() {
    return cy.expect(resolveClaimButton.absent());
  },
  openDeclareLostModal() {
    cy.expect(resolveClaimButton.exists());
    cy.do(resolveClaimButton.choose(DECLARE_LOST_ACTION_NAME));
    return ConfirmItemStatusModal;
  },
  openMarkAsMissingModal() {
    cy.expect(resolveClaimButton.exists());
    cy.do(resolveClaimButton.choose(MARK_AS_MISSING_ACTION_NAME));
    return ConfirmItemStatusModal;
  },
  renewLoan() {
    cy.do([Button({ icon: 'ellipsis' }).click(), Button('Renew').click()]);
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
  closeLoanDetails() {
    cy.do(
      PaneHeader()
        .find(Button({ ariaLabel: 'Close ' }))
        .click(),
    );
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
    const expectedFileNameMask = /export\.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);
  },
  verifyContentOfExportFileName(actual, ...expectedArray) {
    expectedArray.forEach((expectedItem) => expect(actual).to.include(expectedItem));
  },
  verifyResultsInTheRow: (allContentToCheck, rowIndex = 0) => {
    return allContentToCheck.forEach((contentToCheck) => cy.expect(
      MultiColumnListRow({ indexRow: `row-${rowIndex}` })
        .find(MultiColumnListCell({ content: including(contentToCheck) }))
        .exists(),
    ));
  },
  checkLoanDate(date) {
    cy.expect(LoanDateKeyValue.has({ value: including(date) }));
  },
  verifyButtonRedirectsToCorrectPage({ title = '', expectedPage }) {
    cy.do(Button(including(title)).click());
    cy.expect(PaneHeader(including(expectedPage)).exists());
  },
  verifyLinkRedirectsCorrectPage({ title = '', href = '', expectedPage }) {
    if (title) {
      cy.do(Link(including(title)).click());
    } else {
      cy.do(Link({ href: including(href) }).click());
    }
    cy.expect(PaneHeader(including(expectedPage)).exists());
  },
};
