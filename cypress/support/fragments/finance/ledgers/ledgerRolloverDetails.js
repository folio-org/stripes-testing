import {
  Button,
  Checkbox,
  ConfirmationModal,
  HTML,
  PaneHeader,
  RepeatableFieldItem,
  Section,
  Select,
  including,
  matching,
} from '../../../../../interactors';
import UnpaidInvoiceListModal from '../modals/unpaidInvoiceListModal';
import InteractorsTools from '../../../utils/interactorsTools';
import States from '../states';

const ledgerRollverDetailsPane = Section({ id: 'pane-ledger-rollover-form' });

// ledger rollover details header
const ledgerRollverDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-ledger-rollover-form' });
const actionsButton = Button('Actions');

const fiscalYearSelect = Select({ name: 'toFiscalYearId' });

const budgetDetailsSection = ledgerRollverDetailsPane.find(Section({ id: 'budgets' }));
const encumbrancesDetailsSection = ledgerRollverDetailsPane.find(Section({ id: 'encumbrances' }));

const cancelButton = ledgerRollverDetailsPane.find(Button('Cancel'));
const testRolloverButton = ledgerRollverDetailsPane.find(Button('Test rollover'));
const rolloverButton = ledgerRollverDetailsPane.find(Button('Rollover'));

const messages = {
  testRolloverConfirm:
    'Please confirm that you have completed the necessary details and are ready to proceed with your rollover TEST. This process may take several minutes to complete. A link to the results will be sent to test@folio.org when the process is complete.',
  rolloverConfirm:
    'Ledger (?:\\S+) for (?:\\S+) will be rolled over to (?:\\S+). Please confirm that you have completed the necessary details and are ready to proceed with rollover. This process may take several minutes to complete and cannot be undone.',
  rolloverFailed:
    '(?:\\S+) was already rolled over from the fiscal year (?:\\S+) to the fiscal year (?:\\S+)',
};

export default {
  waitLoading: () => {
    cy.expect(ledgerRollverDetailsPane.exists());
  },
  expandActionsDropdown() {
    cy.do(ledgerRollverDetailsPaneHeader.find(actionsButton).click());
  },
  checkLedgerRolloverDetails({ fiscalYear } = {}) {
    cy.expect([
      ledgerRollverDetailsPane.find(HTML(fiscalYear)).exists(),
      budgetDetailsSection.exists(),
      encumbrancesDetailsSection.exists(),
      cancelButton.has({ disabled: false, visible: true }),
      testRolloverButton.has({ disabled: true, visible: true }),
      rolloverButton.has({ disabled: true, visible: true }),
    ]);
  },
  verifyCheckboxState(checkboxName, isChecked = true) {
    cy.expect(Checkbox({ name: checkboxName }).has({ checked: isChecked }));
  },
  fillLedgerRolloverFields({ fiscalYear, rolloverBudgets, rolloverEncumbrance }) {
    cy.do([fiscalYearSelect.click(), fiscalYearSelect.choose(fiscalYear)]);

    if (rolloverBudgets) {
      this.setRolloverBudgetFields(rolloverBudgets);
    }
    if (rolloverEncumbrance) {
      this.setRolloverEncumbranceFields(rolloverEncumbrance);
    }
  },
  setRolloverBudgetFields(rolloverBudgets = []) {
    rolloverBudgets.forEach((details, index) => {
      if (details.checked) {
        cy.do(Checkbox({ name: `budgetsRollover[${index}].rolloverAllocation` }).click());
      }

      if (details.rolloverBudget) {
        cy.do([
          Select({ name: `budgetsRollover[${index}].rolloverBudgetValue` }).click(),
          Select({ name: `budgetsRollover[${index}].rolloverBudgetValue` }).choose(
            details.rolloverBudget,
          ),
        ]);
      }

      if (details.rolloverValue) {
        cy.do([
          Select({ name: `budgetsRollover[${index}].addAvailableTo` }).click(),
          Select({ name: `budgetsRollover[${index}].addAvailableTo` }).choose(
            details.rolloverValue,
          ),
        ]);
      }
    });
  },
  setRolloverEncumbranceFields(rolloverEncumbrance) {
    if (rolloverEncumbrance.ongoing) {
      this.setEncumbranceRowFields({
        label: 'Ongoing encumbrances',
        encumbrances: rolloverEncumbrance.ongoing,
      });
    }
    if (rolloverEncumbrance.ongoingSubscription) {
      this.setEncumbranceRowFields({
        label: 'Ongoing-subscription encumbrances',
        encumbrances: rolloverEncumbrance.ongoingSubscription,
      });
    }
    if (rolloverEncumbrance.oneTime) {
      this.setEncumbranceRowFields({
        label: 'One-time encumbrances',
        encumbrances: rolloverEncumbrance.oneTime,
      });
    }
  },
  setEncumbranceRowFields({ label, encumbrances }) {
    const fieldItem = encumbrancesDetailsSection.find(
      RepeatableFieldItem({ content: including(label) }),
    );
    cy.do(fieldItem.find(Checkbox()).click());
    // wait for fields to become enabled
    cy.wait(300);

    if (encumbrances.basedOn) {
      cy.do([
        fieldItem.find(Select({ label: including('Based on') })).click(),
        fieldItem.find(Select({ label: including('Based on') })).choose(encumbrances.basedOn),
      ]);
    }
  },
  clickContinueInConfirmationModal() {
    cy.wait(2000);
    cy.get('body').then(($body) => {
      if ($body.find('[id=unpaid-invoice-list-modal]').length) {
        UnpaidInvoiceListModal.verifyModalView();
        UnpaidInvoiceListModal.clickContinueButton();
      } else {
        // do nothing if modal is not displayed
      }
    });
  },
  clickTestRolloverButton({ rolloverTestStarted = true } = {}) {
    const confirmModal = ConfirmationModal('Fiscal year rollover test');

    cy.expect(testRolloverButton.has({ disabled: false }));
    cy.do(testRolloverButton.triggerClick());

    this.clickContinueInConfirmationModal();

    cy.expect(confirmModal.has({ message: messages.testRolloverConfirm }));
    cy.do(confirmModal.confirm());

    if (rolloverTestStarted) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(States.rolloverTestStartedSuccessfully)),
      );
    }
  },
  clickRolloverButton({ rolloverFailed = false } = {}) {
    const confirmModal = ConfirmationModal('Fiscal year rollover');

    cy.expect(rolloverButton.has({ disabled: false }));
    cy.do(rolloverButton.triggerClick());
    UnpaidInvoiceListModal.clickContinueButton();

    cy.expect(confirmModal.has({ message: matching(new RegExp(messages.rolloverConfirm)) }));
    cy.do(confirmModal.confirm());

    if (rolloverFailed) {
      InteractorsTools.checkCalloutErrorMessage(matching(new RegExp(messages.rolloverFailed)));
    }
  },
};
