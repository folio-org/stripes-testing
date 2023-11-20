import {
  Button,
  Section,
  Selection,
  SelectionList,
  including,
  matching,
} from '../../../../interactors';
import OrderStates from './orderStates';
import SearchHelper from '../finance/financeHelper';
import InteractorsTools from '../../utils/interactorsTools';

const orderEditFormRoot = Section({ id: 'pane-poForm' });

const cancelButton = Button('Cancel');
const saveButton = Button('Save & close');

const buttons = {
  Cancel: cancelButton,
  'Save & close': saveButton,
};

export default {
  waitLoading() {
    cy.expect(orderEditFormRoot.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  selectOrderTemplate(templateName) {
    this.selectDropDownValue('Template name', templateName);
  },
  selectDropDownValue(label, option) {
    cy.do([
      Selection(including(label)).open(),
      SelectionList().filter(option),
      SelectionList().select(including(option)),
    ]);
  },
  selectVendorByName(organizationName) {
    cy.do([Button('Organization look-up').click()]);
    SearchHelper.searchByName(organizationName);
    SearchHelper.selectFromResultsList();
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(orderEditFormRoot.absent());
  },
  clickSaveButton({ orderSaved = true } = {}) {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());

    if (orderSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.orderSavedSuccessfully)),
      );
    }
    // wait for changes to be applied
    cy.wait(2000);
  },
};
