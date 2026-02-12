import uuid from 'uuid';
import {
  Button,
  Checkbox,
  Form,
  Label,
  NavListItem,
  Pane,
  TextField,
} from '../../../../../interactors';

const checkoutForm = Form({ id: 'checkout-form' });
const timeoutDurationTextField = TextField({ id: 'checkoutTimeoutDuration' });
const userCustomFieldsCheckbox = Checkbox({ id: 'useCustomFieldsAsIdentifiers' });

export default {
  waitLoading() {
    cy.expect([
      Pane('Other settings').exists(),
      checkoutForm.exists(),
      checkoutForm.find(Label('Patron id(s) for checkout scanning*')).exists(),
    ]);
    cy.wait(2000);
  },

  openTabCirculationOtherSettings() {
    cy.do(NavListItem('Circulation').click());
    cy.do(NavListItem('Other settings').click());
  },

  verifyUserCustomFieldsCheckboxIsSelected(selected = true) {
    cy.expect(userCustomFieldsCheckbox.has({ checked: selected }));
  },

  selectUserCustomFieldsCheckbox(select = true) {
    if (select) {
      cy.do(userCustomFieldsCheckbox.checkIfNotSelected());
    } else {
      cy.do(userCustomFieldsCheckbox.uncheckIfSelected());
    }
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

  saveOtherSettings() {
    cy.do(Button('Save').click());
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
      timeoutDurationTextField.fillIn(checkoutTimeoutDuration.toString()),
    ]);
    cy.wait(1000);
    cy.get('#clickable-savescanid').then(($saveButton) => {
      if ($saveButton.prop('disabled') === false) {
        cy.log('Save button is enabled');
        cy.wait(500);
        cy.wrap($saveButton).click();
        cy.wait(2000);
      } else {
        cy.log('Save button is disabled');
      }
    });
  },

  verifyOtherSettingsContainsParams(params) {
    this.getOtherSettingsViaApi().then((response) => {
      const otherSettings = response.body.circulationSettings[0].value;
      Object.keys(params).forEach((key) => {
        expect(otherSettings[key]).to.equal(params[key]);
      });
    });
  },

  getOtherSettingsViaApi() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'circulation/settings?query=(name==other_settings)',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response;
      });
  },

  setOtherSettingsViaApi(params) {
    return this.getOtherSettingsViaApi().then((otherSettingsResp) => {
      let config = otherSettingsResp.body.circulationSettings[0];

      if (otherSettingsResp.body.circulationSettings.length === 0) {
        config = {
          value: {
            audioAlertsEnabled: false,
            audioTheme: 'classic',
            checkoutTimeout: true,
            checkoutTimeoutDuration: 3,
            prefPatronIdentifier: 'barcode,username',
            useCustomFieldsAsIdentifiers: false,
            wildcardLookupEnabled: false,
          },
          name: 'other_settings',
          id: uuid(),
        };

        config.value = {
          ...config.value,
          ...params,
        };

        cy.okapiRequest({
          method: 'POST',
          path: 'circulation/settings',
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
          body: config,
        });
      } else {
        config.value = {
          ...config.value,
          ...params,
        };

        cy.okapiRequest({
          method: 'PUT',
          path: `circulation/settings/${config.id}`,
          body: {
            id: config.id,
            name: config.name,
            enabled: config.enabled,
            value: config.value,
          },
          isDefaultSearchParamsRequired: false,
        });
      }
    });
  },
};
