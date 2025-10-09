import { Button, Select, TextField, including } from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';

export default {
  fillFolioName(name) {
    cy.do(TextField('FOLIO name*').fillIn(name));
  },
  fillCode() {
    cy.do(TextField('Code*').fillIn(`testCode${getRandomPostfix()}`));
  },
  fillDiscoveryDisplayName() {
    cy.do(TextField('Discovery display name*').fillIn(`testDisplayName${getRandomPostfix()}`));
  },
  selectRemoteStorage(value = 'RS1') {
    // the asterisk sometimes doesn't appear immediately, so we use `exists` to wait for it
    cy.expect(Select('Remote storage*').exists());
    // Check if the option is not disabled
    cy.expect(Select('Remote storage*').has({ optionsText: including(value) }));
    cy.do(Select('Remote storage*').choose(value));
  },
  selectServicePoint(value = 'Online') {
    cy.do([Select('Service point(s)').choose(value), Button('Add service point').click()]);
  },
  saveAndClose() {
    cy.do(Button({ id: 'clickable-save-location' }).click());
  },
};
