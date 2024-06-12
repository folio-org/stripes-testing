import uuid from 'uuid';
import { Button, Checkbox, Form, Label, Pane, TextField } from '../../../../../interactors';

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
      .then((otherSettingsResp) => {
        const newConfig = otherSettingsResp.body.configs.length === 0;
        let config = otherSettingsResp.body.configs[0];

        if (newConfig) {
          config = {
            value:
              '{"audioAlertsEnabled":false,"audioTheme":"classic","checkoutTimeout":true,"checkoutTimeoutDuration":3,"prefPatronIdentifier":"barcode,username","useCustomFieldsAsIdentifiers":false,"wildcardLookupEnabled":false}',
            module: 'CHECKOUT',
            configName: 'other_settings',
            id: uuid(),
          };
          cy.okapiRequest({
            method: 'POST',
            path: 'configurations/entries',
            isDefaultSearchParamsRequired: false,
            failOnStatusCode: false,
            body: config,
          });
        } else {
          const newValue = { ...JSON.parse(config.value), ...params };
          cy.okapiRequest({
            method: 'PUT',
            path: `configurations/entries/${config.id}`,
            body: {
              id: config.id,
              module: config.module,
              configName: config.configName,
              enabled: config.enabled,
              value: JSON.stringify(newValue),
            },
            isDefaultSearchParamsRequired: false,
          });
        }
      });
  },
};
