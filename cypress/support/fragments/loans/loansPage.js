import { matching } from '@interactors/html';
import {
  Button,
  Pane,
  KeyValue,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
  Checkbox,
  Dropdown,
  DropdownMenu,
  PaneHeader,
  Link,
  MultiColumnListHeader,
} from '../../../../interactors';
import ConfirmItemStatusModal from '../users/loans/confirmItemStatusModal';

const DECLARE_LOST_ACTION_NAME = 'Declare lost';
const MARK_AS_MISSING_ACTION_NAME = 'Mark as missing';

const claimReturnedButton = Button('Claim returned');
const changeDueDateButton = Button('Change due date');
const resolveClaimButton = Dropdown('Resolve claim');
const LoanDateKeyValue = KeyValue('Loan date');
const renewButton = Button('Renew');
const declaredLostButton = Button(DECLARE_LOST_ACTION_NAME);
const selectColumnsDropdown = Button('Select Columns');
const effectiveCallNumber = Checkbox({ id: 'Effective call number string' });
const effectiveCallNumberHeader = MultiColumnListHeader('Effective call number string');

// Function to get all call number values from the table
function getCallNumberValues() {
  const callNumbers = [];
  return cy
    .get('div[class^="mclRowContainer--"]')
    .find('[data-row-index]')
    .each(($row) => {
      cy.get('[data-test-list-call-numbers="true"]', { withinSubject: $row })
        .invoke('text')
        .then((callNumber) => {
          callNumbers.push(callNumber.trim());
        });
    })
    .then(() => callNumbers);
}

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
    cy.do(Checkbox({ name: 'check-all' }).click());
  },
  checkOneLoan() {
    cy.do(MultiColumnListRow({ index: 0 }).find(Checkbox()).click());
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
  verifyButtonsForDeclaredLostLoan() {
    cy.expect([
      changeDueDateButton.is({ disabled: true }),
      declaredLostButton.absent(),
      renewButton.is({ disabled: false }),
    ]);
  },
  claimReturnedAndConfirm(reasonWhyItemChangesStatus) {
    this.claimReturned();
    ConfirmItemStatusModal.confirmItemStatus(reasonWhyItemChangesStatus);
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
    return cy.expect(Button({ text: 'Claim returned', visible: true }).absent());
  },
  claimResolveButtonIsAbsent() {
    return cy.expect(resolveClaimButton.absent());
  },
  openDeclareLostModal() {
    cy.expect(resolveClaimButton.exists());
    cy.do(resolveClaimButton.choose(DECLARE_LOST_ACTION_NAME));
  },
  openMarkAsMissingModal() {
    cy.expect(resolveClaimButton.exists());
    cy.do(resolveClaimButton.choose(MARK_AS_MISSING_ACTION_NAME));
  },
  renewLoan() {
    cy.do([Button({ icon: 'ellipsis' }).click(), renewButton.click()]);
  },
  renewalMessageCheck(message) {
    this.renewLoan();
    cy.wait(1000);
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
    cy.expect(
      MultiColumnListRow({
        indexRow: 'row-0',
        content: matching(/\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} (AM|PM)/),
      }).exists(),
    );
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

  clickSelectColumnsDropdown() {
    cy.do(selectColumnsDropdown.click());
    cy.wait(2000);
  },

  checkEffectiveCallNumber() {
    cy.do(effectiveCallNumber.click());
    cy.wait(1000);
  },

  clickEffectiveCallNumberHeader() {
    cy.wait(500);
    cy.do(effectiveCallNumberHeader.click());
    cy.wait(1000);
  },

  verifyEffectiveCallNumberColumnVisibility(status) {
    if (status === 'visible') {
      cy.expect(effectiveCallNumberHeader.exists());
    } else if (status === 'hidden') {
      cy.expect(effectiveCallNumberHeader.absent());
    }
  },

  verifyEffectiveCallNumberCheckboxChecked(isChecked = true) {
    cy.expect(effectiveCallNumber.has({ checked: isChecked }));
  },

  verifyCallNumbersSorted(isDescending = false) {
    getCallNumberValues().then((callNumbers) => {
      if (isDescending) {
        cy.expect(callNumbers).to.deep.equal(callNumbers.sort().reverse());
      } else {
        cy.expect(callNumbers).to.deep.equal(callNumbers.sort());
      }
    });
  },

  verifyCallNumbersAscending() {
    this.verifyCallNumbersSorted(false);
  },

  verifyCallNumbersDescending() {
    this.verifyCallNumbersSorted(true);
  },
};
