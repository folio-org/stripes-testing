import { including } from '@interactors/html';
import { Button, MultiColumnListCell, Pane, Select } from '../../../../../../interactors';
import keyValue from '../../../../../../interactors/key-value';

export default {
  selectInstitution() {
    cy.do(Select('Institution').choose(including('KU')));
  },
  selectCampus() {
    cy.do(Select('Campus').choose(including('(E)')));
  },
  selectLibrary() {
    cy.do(Select('Library').choose(including('(E)')));
  },
  createNewLocation() {
    cy.do(Button('New').click());
  },
  verifyRemoteStorageValue(value = 'RS1') {
    cy.expect(keyValue('Remote storage').has({ value }));
  },
  deleteLocation(name) {
    cy.do([
      Pane('Locations').find(MultiColumnListCell({ content: name })).click(),
      Button('Actions').click(),
      Button('Delete').click(),
      Button({ id: 'clickable-deletelocation-confirmation-confirm' }).click()
    ]);
  }
};