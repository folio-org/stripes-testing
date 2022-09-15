import { Pane, Checkbox, Label, Form, Button, TextField } from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect([
      Pane('Other settings').exists(),
      Form({ id: 'checkout-form' }).exists(),
      Form({ id: 'checkout-form' }).find(Label('Patron id(s) for checkout scanning*')).exists()
    ]);
  },

  verifyCheckboxIsChecked(checkBoxId, alias) {
    cy.get(checkBoxId)
      .as(alias)
      .invoke('is', ':checked')
      .then((initial) => {
        if (!initial) {
          cy.get('@checkbox').uncheck();
        } else {
          cy.get('@checkbox').check();
        }
      });
  },

  selectPatronIdsForCheckoutScanning(optionsNames, checkoutTimeoutDuration) {
    cy.wrap(optionsNames).each(optionName => {
      if (optionName === 'Barcode') {
        this.verifyCheckboxIsChecked('#barcode-checkbox', 'checkbox');
      } else cy.do(Checkbox(optionName).click());
    });
    this.verifyCheckboxIsChecked('#checkoutTimeout', 'checkoutTimeout');

    cy.do([
      TextField({ id: 'checkoutTimeoutDuration' }).exists(),
      TextField({ id: 'checkoutTimeoutDuration' }).fillIn(''),
      TextField({ id: 'checkoutTimeoutDuration' }).fillIn((+checkoutTimeoutDuration + 1).toString()),
      Button('Save').exists(),
      Button('Save').click()]);
    cy.reload().then(() => cy.do([TextField({ id: 'checkoutTimeoutDuration' }).fillIn(''),
      TextField({ id: 'checkoutTimeoutDuration' }).fillIn(checkoutTimeoutDuration),
      Button('Save').click()]));
  },
};
