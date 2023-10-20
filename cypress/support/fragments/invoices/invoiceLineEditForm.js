import {
  Button,
  Checkbox,
  SearchField,
  Section,
  Selection,
  SelectionList,
  TextField,
  including,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import FinanceHelper from '../finance/financeHelper';
import InvoiceStates from './invoiceStates';

const invoiceLineEditFormRoot = Section({ id: 'pane-invoice-line-form' });
const informationSection = invoiceLineEditFormRoot.find(
  Section({ id: 'invoiceLineForm-information' }),
);
const fundDistributionSection = Section({ id: 'invoiceLineForm-fundDistribution' });

const cancelButtom = Button('Cancel');
const saveButtom = Button('Save & close');

const infoFields = {
  description: informationSection.find(TextField({ id: 'description' })),
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
  'Save & close': saveButtom,
};

export default {
  waitLoading() {
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
    cy.do(Selection(including(label)).open());
  },
  checkDropDownOptionsListCount(count) {
    cy.get('ul[aria-label="Expense class options filter"] li').then((listItems) => {
      cy.expect([...listItems].length).to.equal(count);
    });
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
  },
  addFundDistribution() {
    cy.do(Button('Add fund distribution').click());
  },
  fillInvoiceLineFields(invoiceLine) {
    if (invoiceLine.description) {
      cy.do(infoFields.description.fillIn(invoiceLine.description));
      cy.do(infoFields.description.has({ value: invoiceLine.description }));
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
  clickCancelButton() {
    cy.do(cancelButtom.click());
    cy.expect(invoiceLineEditFormRoot.absent());
  },
  clickSaveButton({ checkCalloutMessage = true } = {}) {
    cy.expect(saveButtom.has({ disabled: false }));
    cy.do(saveButtom.click());

    if (checkCalloutMessage) {
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
    }
    // wait for changes to be applied
    cy.wait(1000);
  },
};
