import uuid from 'uuid';
import { HTML, including } from '@interactors/html';
import {
  Button,
  Checkbox,
  Form,
  Label,
  MultiSelect,
  NavListItem,
  Pane,
  TextField,
  ValueChipRoot,
} from '../../../../../interactors';

const checkoutForm = Form({ id: 'checkout-form' });
const getPrefPatronIdentifier = (otherSettings) =>
  otherSettings.body.circulationSettings[0]?.value?.prefPatronIdentifier || '';
const timeoutDurationTextField = TextField({ id: 'checkoutTimeoutDuration' });
const userCustomFieldsCheckbox = Checkbox({ id: 'useCustomFieldsAsIdentifiers' });
const barcodeCheckbox = Checkbox({ id: 'barcode-checkbox' });
const usernameCheckbox = Checkbox({ id: 'username-checkbox' });
const saveButton = Button({ id: 'clickable-savescanid' });
// Two MultiSelects exist in the form. The patron identifiers one has no label prop, so
// its BigTest locator resolves to ''. The "Custom fields at checkout" one has a label,
// so its locator resolves to that label text. MultiSelect('') uniquely targets the
// patron identifiers dropdown without relying on placeholder, id, or index.
const patronIdentifiersMultiSelect = MultiSelect('');

export default {
  waitLoading() {
    cy.expect([
      Pane('Other settings').exists(),
      checkoutForm.exists(),
      checkoutForm.find(Label('Patron id(s) for checkout scanning*')).exists(),
    ]);
    cy.wait(5000);
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

  selectCustomFieldPatronIdentifier(fieldName) {
    cy.do(patronIdentifiersMultiSelect.choose(fieldName));
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
    this.waitLoading();
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

  // Fetching the current "Other settings" values.
  // Checking if "Patron id(s) for checkout scanning" is enabled by the given identifier.
  // Enabling it if not already enabled.
  // Calls setFlag(true) if identifier was added so the caller can track cleanup.
  enablePrefPatronIdentifierIfNeeded(identifier, setFlag) {
    return this.getOtherSettingsViaApi().then((otherSettingsResp) => {
      const prefPatronIdentifier = getPrefPatronIdentifier(otherSettingsResp);

      if (!prefPatronIdentifier.includes(identifier)) {
        setFlag(true);
        const updatedValue = prefPatronIdentifier
          ? `${prefPatronIdentifier},${identifier}`
          : identifier;

        this.setOtherSettingsViaApi({ prefPatronIdentifier: updatedValue });
      }
    });
  },

  // Fetching the current "Other settings" values.
  // Checking if "Patron id(s) for checkout scanning" is enabled by the given identifier.
  // Verifying that it was enabled earlier.
  // Ensuring that the identifier is not the only enabled value, since at least one value is required.
  // Disabling the identifier if appropriate.
  disablePrefPatronIdentifierIfNeeded(identifier, shouldRemove) {
    return this.getOtherSettingsViaApi().then((otherSettingsResp) => {
      const prefPatronIdentifier = getPrefPatronIdentifier(otherSettingsResp);

      if (
        shouldRemove &&
        prefPatronIdentifier.includes(identifier) &&
        prefPatronIdentifier !== identifier
      ) {
        const updatedValue = prefPatronIdentifier
          .split(',')
          .filter((id) => id !== identifier)
          .join(',');

        this.setOtherSettingsViaApi({ prefPatronIdentifier: updatedValue });
      }
    });
  },

  checkBarcodeCheckbox() {
    cy.do(barcodeCheckbox.checkIfNotSelected());
  },

  uncheckBarcodeCheckbox() {
    cy.do(barcodeCheckbox.uncheckIfSelected());
  },

  verifyBarcodeCheckboxChecked(checked = true) {
    cy.expect(barcodeCheckbox.has({ checked }));
  },

  checkUsernameCheckbox() {
    cy.do(usernameCheckbox.checkIfNotSelected());
  },

  verifyUsernameCheckboxChecked(checked = true) {
    cy.expect(usernameCheckbox.has({ checked }));
  },

  verifySaveButtonEnabled(enabled = true) {
    cy.expect(saveButton.has({ disabled: !enabled }));
  },

  verifyCustomFieldsDropdownVisible(visible = true) {
    if (visible) {
      cy.expect(patronIdentifiersMultiSelect.exists());
    } else {
      cy.expect(patronIdentifiersMultiSelect.absent());
    }
  },

  // ValueChipRoot unscoped: "Custom fields at checkout" MultiSelect is never given chips in this
  // test, so all chips on the page belong to the patron identifiers dropdown.
  verifyCustomFieldsDropdownEmpty() {
    cy.expect(ValueChipRoot().absent());
  },

  verifyCustomFieldsDropdownHasValue(fieldName) {
    cy.expect(ValueChipRoot(fieldName).exists());
  },

  removeCustomFieldFromDropdown(fieldName) {
    cy.do(
      ValueChipRoot(fieldName)
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },

  verifyWarningMessage(visible = true) {
    if (visible) {
      cy.expect(HTML(including('Please select to continue')).exists());
    } else {
      cy.expect(HTML(including('Please select to continue')).absent());
    }
  },

  uncheckAllPatronIdentifierCheckboxes() {
    cy.do(barcodeCheckbox.uncheckIfSelected());
    cy.do(usernameCheckbox.uncheckIfSelected());
    cy.do(userCustomFieldsCheckbox.uncheckIfSelected());
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

  deleteOtherSettingsViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `circulation/settings/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  restoreOtherSettingsViaApi(settings) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'circulation/settings',
      isDefaultSearchParamsRequired: false,
      body: settings,
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
