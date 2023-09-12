import TenantPane from '../baseTenantPane';
import {
  Button,
  KeyValue,
  MultiColumnList,
  MultiColumnListCell,
  Pane,
} from '../../../../../../interactors';

const selectInstitution = () => TenantPane.selectOption('Institution', 'KU');

const selectCampus = () => TenantPane.selectOption('Campus', '(E)');

const selectLibrary = () => TenantPane.selectOption('Library', '(E)');

const addButton = Button('New');
const table = MultiColumnList({ id: 'locations-list' });
const detailsPane = Pane({ id: 'location-details' });
const actionsBtn = detailsPane.find(Button('Actions'));

export default {
  ...TenantPane,
  waitLoading() {
    TenantPane.waitLoading('Locations');
  },
  viewTable() {
    selectInstitution();
    selectCampus();
    selectLibrary();
  },
  checkNoActionButtons() {
    cy.expect(addButton.absent());

    cy.do(table.click({ row: 0 }));
    cy.expect(detailsPane.exists());
    cy.expect(actionsBtn.absent());
  },
  selectInstitution,
  selectCampus,
  selectLibrary,
  createNewLocation() {
    cy.do(addButton.click());
  },
  verifyRemoteStorageValue(value = 'RS1') {
    cy.expect(KeyValue('Remote storage').has({ value }));
  },
  deleteLocation(name) {
    cy.do([
      Pane('Locations')
        .find(MultiColumnListCell({ content: name }))
        .click(),
      Button('Actions').click(),
      Button('Delete').click(),
      Button({ id: 'clickable-deletelocation-confirmation-confirm' }).click(),
    ]);
  },
};
