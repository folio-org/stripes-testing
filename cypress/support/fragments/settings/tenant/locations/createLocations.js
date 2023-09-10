import { Button, Select, TextField } from '../../../../../../interactors';
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
    cy.do(Select('Remote storage*').choose(value));
  },
  selectServicePoint(value = 'Online') {
    cy.do([Select('Service point(s)').choose(value), Button('Add service point').click()]);
  },
  saveAndClose() {
    cy.do(Button({ id: 'clickable-save-location' }).click());
  },
};
