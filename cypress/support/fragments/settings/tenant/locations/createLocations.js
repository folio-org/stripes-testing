import { Accordion, Button, Select, TextField, including } from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';

const locationDetailsSection = Accordion({ id: 'detailsSection' });

export default {
  verifyNewFormIsOpen() {
    cy.expect(Button({ id: 'clickable-save-location' }).has({ disabled: true }));
  },
  fillFolioName(name) {
    cy.do(TextField('FOLIO name*').fillIn(name));
  },
  fillCode(code) {
    cy.do(TextField('Code*').fillIn(code || `testCode${getRandomPostfix()}`));
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
};
