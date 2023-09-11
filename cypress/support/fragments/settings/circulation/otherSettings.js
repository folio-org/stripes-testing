import { Pane, Checkbox, Label, Form, Button, TextField } from '../../../../../interactors';

const checkoutForm = Form({ id: 'checkout-form' });
const timeoutDurationTextField = TextField({ id: 'checkoutTimeoutDuration' });
const saveButton = Button('Save');

export default {
  waitLoading() {
    cy.expect([
      Pane('Other settings').exists(),
      checkoutForm.exists(),
      checkoutForm.find(Label('Patron id(s) for checkout scanning*')).exists(),
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
    cy.wrap(optionsNames).each((optionName) => {
      if (optionName === 'Barcode') {
        this.verifyCheckboxIsChecked('#barcode-checkbox', 'checkbox');
      } else if (optionName === 'Username') {
        this.verifyCheckboxIsChecked('#username-checkbox', 'checkbox');
      } else cy.do(Checkbox(optionName).click());
    });
    this.verifyCheckboxIsChecked('#checkoutTimeout', 'checkoutTimeout');

    cy.do([
      timeoutDurationTextField.exists(),
      timeoutDurationTextField.fillIn(''),
      timeoutDurationTextField.fillIn((+checkoutTimeoutDuration + 1).toString()),
      saveButton.exists(),
      saveButton.click(),
    ]);
    cy.reload().then(() => cy.do([
      timeoutDurationTextField.fillIn(''),
      timeoutDurationTextField.fillIn(checkoutTimeoutDuration),
      saveButton.click(),
    ]));
  },

  setOtherSettingsViaApi(params) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'configurations/entries?query=(module==CHECKOUT%20and%20configName==other_settings)',
        isDefaultSearchParamsRequired: false,
      })
      .then((otherSetingsResp) => {
        const configs = otherSetingsResp.body.configs[0];
        const newValue = { ...JSON.parse(configs.value), ...params };
        cy.okapiRequest({
          method: 'PUT',
          path: `configurations/entries/${configs.id}`,
          body: {
            id: configs.id,
            module: configs.module,
            configName: configs.configName,
            enabled: configs.enabled,
            value: JSON.stringify(newValue),
          },
          isDefaultSearchParamsRequired: false,
        });
      });
  },
};
