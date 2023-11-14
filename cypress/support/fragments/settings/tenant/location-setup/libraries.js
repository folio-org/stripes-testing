import uuid from 'uuid';
import TenantPane, { getDefaultTenant } from '../baseTenantPane';
import { EditableListRow, MultiColumnListCell, Link } from '../../../../../../interactors';

export default {
  ...TenantPane,
  waitLoading() {
    TenantPane.waitLoading('Libraries');
  },
  checkResultsTableContent(records) {
    TenantPane.checkResultsTableColumns([
      'Library',
      'Code',
      'Last updated',
      '# of Locations',
      'Actions',
    ]);
    TenantPane.checkResultsTableContent(records);
  },
  checkEmptyTableContent() {
    const messages = [
      'Please select an institution and campus to continue.',
      'There are no Libraries',
    ];
    TenantPane.checkEmptyTableContent(messages);
  },
  getDefaultLibrary({ id, name, campusId } = {}) {
    return getDefaultTenant({ id, name, campusId });
  },
  defaultUiLibraries: {
    body: getDefaultTenant({ campusId: uuid() }),
  },
  getViaApi() {
    return TenantPane.getViaApi({ path: 'location-units/libraries' });
  },
  createViaApi(librariesProperties = getDefaultTenant({ campusId: uuid() })) {
    return TenantPane.createViaApi({
      path: 'location-units/libraries',
      body: librariesProperties,
    });
  },
  deleteViaApi(libraryId) {
    return TenantPane.deleteViaApi({
      path: `location-units/libraries/${libraryId}`,
    });
  },
  checkLocationsColumnInResultsTable(numOfLocationsRecords = [], columnIndex = 3) {
    numOfLocationsRecords.forEach((numOfLocations, index) => {
      cy.expect([
        EditableListRow({ index })
          .find(MultiColumnListCell({ columnIndex, content: numOfLocations }))
          .find(Link())
          .exists(),
      ]);
    });
  },
  clickLocationsColumnLink(rowIndex = 0, columnIndex = 3) {
    cy.do([
      EditableListRow({ index: rowIndex })
        .find(MultiColumnListCell({ columnIndex }))
        .find(Link())
        .click(),
    ]);
  },
};
