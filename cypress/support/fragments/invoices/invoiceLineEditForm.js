import {
  Button,
  Modal,
  Checkbox,
  SearchField,
  Section,
  Selection,
  SelectionList,
  TextField,
  including,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import FinanceHelper from '../finance/financeHelper';
import InvoiceStates from './invoiceStates';

const invoiceLineEditFormRoot = Section({ id: 'pane-invoice-line-form' });
const informationSection = invoiceLineEditFormRoot.find(
  Section({ id: 'invoiceLineForm-information' }),
);
const fundDistributionSection = Section({ id: 'invoiceLineForm-fundDistribution' });

const cancelButtom = Button('Cancel');
const saveButton = Button('Save & close');
const subTotalSelector = '#subTotal';

const infoFields = {
  description: informationSection.find(TextField({ id: 'description' })),
  subscriptionInfo: informationSection.find(TextField({ id: 'subscriptionInfo' })),
  subscriptionStartDate: informationSection.find(TextField({ name: 'subscriptionStart' })),
  subscriptionEndDate: informationSection.find(TextField({ name: 'subscriptionEnd' })),
  releaseEncumbrance: informationSection.find(Checkbox({ name: 'releaseEncumbrance' })),
  quantity: informationSection.find(TextField({ id: 'quantity' })),
  subTotal: informationSection.find(TextField({ id: 'subTotal' })),
};

const fundFields = {
  'Expense class': fundDistributionSection.find(
    Button({ id: 'fundDistributions[0].expenseClassId' }),
  ),
};

const buttons = {
  'Release encumbrance': infoFields.releaseEncumbrance,
  Cancel: cancelButtom,
  'Save & close': saveButton,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(invoiceLineEditFormRoot.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  checkFieldsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(fundFields[label].has(conditions));
    });
  },
  selectOrderLines(orderLine) {
    cy.do([
      Button('POL look-up').click(),
      SearchField({ id: 'input-record-search' }).fillIn(orderLine),
      Button('Search').click(),
    ]);
    FinanceHelper.selectFromResultsList();
  },
  expandDropDown(label) {
    cy.wait(2000);
    cy.do(Selection(including(label)).open());
  },
  checkDropDownOptionsListCount(count) {
    cy.wait(2000);
    cy.get('ul[aria-labelledby="sl-label-fundDistributions[0].expenseClassId"] li').then(
      (listItems) => {
        cy.expect([...listItems].length).to.equal(count);
      },
    );
  },
  setDropDownValue(option) {
    cy.do([SelectionList().filter(option), SelectionList().select(including(option))]);
  },
  selectDropDownValue(label, option) {
    cy.do([
      Selection(including(label)).open(),
      SelectionList().filter(option),
      SelectionList().select(including(option)),
    ]);
  },
  selectExpenseClass(expenseClass) {
    this.selectDropDownValue('Expense class', expenseClass);
  },
  selectFundDistribution(fund) {
    this.selectDropDownValue('Fund ID', fund);
    cy.wait(2000);
  },
  clickAddFundDistributionButton() {
    cy.do(Button('Add fund distribution').click());
  },
  fillInvoiceLineFields(invoiceLine) {
    if (invoiceLine.description) {
      cy.do(infoFields.description.fillIn(invoiceLine.description));
      cy.do(infoFields.description.has({ value: invoiceLine.description }));
    }
    if (invoiceLine.subscriptionInfo) {
      cy.do(infoFields.subscriptionInfo.fillIn(invoiceLine.subscriptionInfo));
      cy.do(infoFields.subscriptionInfo.has({ value: invoiceLine.subscriptionInfo }));
    }
    if (invoiceLine.subscriptionStartDate) {
      cy.do(infoFields.subscriptionStartDate.fillIn(invoiceLine.subscriptionStartDate));
      cy.do(infoFields.subscriptionStartDate.has({ value: invoiceLine.subscriptionStartDate }));
    }
    if (invoiceLine.subscriptionEndDate) {
      cy.do(infoFields.subscriptionEndDate.fillIn(invoiceLine.subscriptionEndDate));
      cy.do(infoFields.subscriptionEndDate.has({ value: invoiceLine.subscriptionEndDate }));
    }
    if (invoiceLine.quantity) {
      cy.do(infoFields.quantity.fillIn(invoiceLine.quantity));
      cy.do(infoFields.quantity.has({ value: invoiceLine.quantity }));
    }
    if (invoiceLine.subTotal) {
      cy.do(infoFields.subTotal.fillIn(invoiceLine.subTotal));
      cy.do(infoFields.subTotal.has({ value: invoiceLine.subTotal }));
    }
  },
  clickCancelButton(buttonName = null) {
    cy.do(cancelButtom.click());
    if (buttonName) {
      cy.do(Modal('Are you sure?').find(Button(buttonName)).click());
    }
    cy.expect(invoiceLineEditFormRoot.absent());
  },
  clickSaveButton({ invoiceLineSaved = true } = {}) {
    cy.expect(saveButton.has({ disabled: false }));
    cy.wait(2000);
    cy.do(saveButton.click());

    if (invoiceLineSaved) {
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
    }
    // wait for changes to be applied
    cy.wait(1000);
  },

  setNegativeSubTotal(amount) {
    cy.get(subTotalSelector).clear();
    cy.get(subTotalSelector).type(`-${amount}`);
    cy.get(subTotalSelector).should('have.value', `-${amount}`);
  },

  checkSelectionOptions(selectionName, expectedOptions) {
    cy.do([Selection(selectionName).open()]);
    cy.expect([SelectionList().has({ optionList: expectedOptions })]);
  },

  selectSelectionOption(optionName) {
    cy.do([SelectionList().select(optionName)]);
  },
};
