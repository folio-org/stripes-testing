import {
  Accordion,
  Button,
  Form,
  Select,
  TextField,
  including,
} from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';

const locationDetailsSection = Accordion({ id: 'detailsSection' });
const formRoot = Form({ id: 'form-locations' });

export default {
  verifyNewFormIsOpen({ institution, campus, library }) {
    cy.expect([
      Select('Institution').has({ checkedOptionText: including(institution) }),
      Select('Campus').has({ checkedOptionText: including(campus) }),
      Select('Library').has({ checkedOptionText: including(library) }),
      TextField('FOLIO name*').has({ value: '' }),
      Select('Remote storage*').has({ checkedOptionText: including('No (default)') }),
      TextField('Code*').has({ value: '' }),
      TextField('Discovery display name*').has({ value: '' }),
      Select('Service point(s)').has({ checkedOptionText: including('Select service point') }),
      Select('Status').has({ checkedOptionText: including('Active') }),
      locationDetailsSection.find(Button('New')).exists(),
      Button('Cancel').exists(),
      Button({ id: 'clickable-save-location' }).has({ disabled: true }),
    ]);
  },
  fillFolioName(name) {
    const field = TextField('FOLIO name*');
    cy.intercept('GET', '/locations?query=*name*').as('validateUniqName');
    cy.do([field.fillIn(name), field.blur()]);
    cy.get('input[id="input-location-name"]').should('have.value', name);
    cy.wait('@validateUniqName', { timeout: 10000 });
  },
  fillCode(code) {
    const value = code || `testCode${getRandomPostfix()}`;
    const field = TextField('Code*');
    cy.intercept('GET', '/locations?query=*code*').as('validateUniqCode');
    cy.do([field.fillIn(value), field.blur()]);
    cy.get('input[id="input-location-code"]').should('have.value', value);
    cy.wait('@validateUniqCode', { timeout: 10000 });
  },
  fillDiscoveryDisplayName(name) {
    cy.do(
      TextField('Discovery display name*').fillIn(name || `testDisplayName${getRandomPostfix()}`),
    );
  },
  selectRemoteStorage(value = 'RS1') {
    // the asterisk sometimes doesn't appear immediately, so we use `exists` to wait for it
    cy.expect(Select('Remote storage*').exists());
    // Check if the option is not disabled
    cy.expect(Select('Remote storage*').has({ optionsText: including(value) }));
    cy.do(Select('Remote storage*').choose(value));
  },
  verifyFormRemoteStorageValue(value) {
    cy.expect(Select('Remote storage*').has({ checkedOptionText: including(value) }));
  },
  selectServicePoint(value = 'Online') {
    cy.do([Select('Service point(s)').choose(value), Button('Add service point').click()]);
  },
  clickAddLocationDetail() {
    cy.do(locationDetailsSection.find(Button('New')).click());
  },
  fillLocationDetailName(name) {
    cy.do(locationDetailsSection.find(TextField('Name')).fillIn(name));
  },
  fillLocationDetailValue(value) {
    cy.do(locationDetailsSection.find(TextField('Value')).fillIn(value));
  },
  verifyLocationDetailFields(name, value) {
    cy.expect([
      locationDetailsSection.find(TextField('Name')).has({ value: name }),
      locationDetailsSection.find(TextField('Value')).has({ value }),
    ]);
  },
  saveAndClose() {
    cy.do(Button({ id: 'clickable-save-location' }).click());
  },
  saveAndCloseSuccessfully() {
    cy.do(Button({ id: 'clickable-save-location' }).click());
    cy.expect(formRoot.absent());
  },
  verifyFormIsOpen() {
    cy.expect(formRoot.exists());
  },
  waitFormReadyToEdit({ name, code }) {
    if (name !== undefined) {
      cy.get('input[id="input-location-name"]', { timeout: 15000 }).should('have.value', name);
    }
    if (code !== undefined) {
      cy.get('input[id="input-location-code"]', { timeout: 15000 }).should('have.value', code);
    }
    // Stability gate: give RFF time to flush any pending `initialValues` reinitialize,
    cy.wait(2000);
    if (name !== undefined) {
      cy.get('input[id="input-location-name"]').should('have.value', name);
    }
    if (code !== undefined) {
      cy.get('input[id="input-location-code"]').should('have.value', code);
    }
  },
  verifyFolioNameFieldError(error) {
    cy.expect(TextField('FOLIO name*').has({ error }));
  },
  verifyCodeFieldError(error) {
    cy.expect(TextField('Code*').has({ error }));
  },
  verifyFolioNameFieldNoError() {
    cy.expect(TextField('FOLIO name*').has({ error: undefined }));
  },
  verifyCodeFieldNoError() {
    cy.expect(TextField('Code*').has({ error: undefined }));
  },
  verifySaveButtonEnabled() {
    cy.expect(Button({ id: 'clickable-save-location' }).has({ disabled: false }));
  },
};
