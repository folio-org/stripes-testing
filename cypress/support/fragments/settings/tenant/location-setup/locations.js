import uuid from 'uuid';
import TenantPane from '../baseTenantPane';
import Libraries from './libraries';
import Campuses from './campuses';
import Institutions from './institutions';
import getRandomPostfix from '../../../../utils/stringTools';
import {
  Button,
  KeyValue,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  Select,
  including,
} from '../../../../../../interactors';

const addButton = Button('New');
const table = MultiColumnList({ id: 'locations-list' });
const detailsPane = Pane({ id: 'location-details' });
const actionsBtn = detailsPane.find(Button('Actions'));

const getDefaultLocation = ({ institutionId, campusId, libraryId, servicePointId } = {}) => ({
  id: uuid(),
  isActive: true,
  institutionId,
  campusId,
  libraryId,
  servicePointIds: [servicePointId],
  name: `autotest_location_name_${getRandomPostfix()}`,
  code: `autotest_location_code_${getRandomPostfix()}`,
  discoveryDisplayName: `autotest_name_${getRandomPostfix()}`,
  primaryServicePoint: servicePointId,
});

export default {
  ...TenantPane,
  waitLoading() {
    TenantPane.waitLoading('Locations');
  },
  checkNoActionButtons() {
    cy.expect(addButton.absent());

    cy.do(table.click({ row: 0 }));
    cy.expect(detailsPane.exists());
    cy.expect(actionsBtn.absent());
  },
  selectInstitution() {
    cy.do(Select('Institution').choose(including('KU')));
  },
  selectCampus() {
    cy.do(Select('Campus').choose(including('E)')));
  },
  selectLibrary() {
    cy.do(Select('Library').choose(including('E)')));
  },
  createNewLocation() {
    cy.do(addButton.click());
  },
  getDefaultLocation,
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
  checkResultsTableContent(records) {
    TenantPane.checkResultsTableColumns(['Status', 'Name', 'Code'], table);
    this.checkLocationsTableContent(records);
  },
  checkLocationsTableContent(records = []) {
    cy.expect(addButton.has({ disabled: false }));

    records
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((record, index) => {
        cy.expect([
          MultiColumnListRow({ index })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: 'Active' }),
          MultiColumnListRow({ index })
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: record.name }),
          MultiColumnListRow({ index })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: record.code }),
        ]);
      });
  },
  checkEmptyTableContent() {
    const messages = [
      'Please select an institution, campus and library to continue.',
      'There are no Locations',
    ];
    TenantPane.checkEmptyTableContent(messages);
  },
  getViaApi() {
    return TenantPane.getViaApi({ path: 'locations' });
  },
  createViaApi(locationProperties) {
    return TenantPane.createViaApi({ path: 'locations', body: locationProperties });
  },
  deleteViaApi({ id, libraryId, campusId, institutionId }) {
    return TenantPane.deleteViaApi({ path: `locations/${id}` }).then(() => {
      if (libraryId) {
        Libraries.deleteViaApi(libraryId);
      }
      if (campusId) {
        Campuses.deleteViaApi(campusId);
      }
      if (institutionId) {
        Institutions.deleteViaApi(institutionId);
      }
    });
  },
};
