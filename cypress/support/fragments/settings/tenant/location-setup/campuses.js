import uuid from 'uuid';
import TenantPane, { getDefaultTenant } from '../baseTenantPane';
import {
  EditableListRow,
  MultiColumnListCell,
  MultiColumnListRow,
  Link,
  including,
} from '../../../../../../interactors';

export default {
  ...TenantPane,
  waitLoading() {
    TenantPane.waitLoading('Campuses');
  },
  getDefaultCampuse({ id, name, institutionId = '' } = {}) {
    return getDefaultTenant({ id, name, institutionId });
  },
  defaultUiCampuses: {
    body: getDefaultTenant({ institutionId: uuid() }),
  },
  checkResultsTableContent(records) {
    TenantPane.checkResultsTableColumns([
      'Campus',
      'Code',
      'Last updated',
      '# of Libraries',
      'Actions',
    ]);
    TenantPane.checkResultsTableContent(records);
  },
  checkEmptyTableContent() {
    const messages = ['Please select an institution to continue.', 'There are no Campuses'];
    TenantPane.checkEmptyTableContent(messages);
  },
  getViaApi() {
    return TenantPane.getViaApi({ path: 'location-units/campuses' });
  },
  createViaApi(campusesProperties = getDefaultTenant({ institutionId: uuid() })) {
    return TenantPane.createViaApi({ path: 'location-units/campuses', body: campusesProperties });
  },
  deleteViaApi(campusId) {
    return TenantPane.deleteViaApi({ path: `location-units/campuses/${campusId}` });
  },
  checkLibrariesColumnInResultsTable(records = [], columnIndex = 3) {
    records
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((record, index) => {
        cy.expect([
          EditableListRow({ index })
            .find(MultiColumnListCell({ columnIndex, content: String(record.numOfLibraries) }))
            .find(Link())
            .exists(),
        ]);
      });
  },
  clickLibrariesColumnLink(campusName, columnIndex = 3) {
    cy.wait(2000);
    cy.do(
      MultiColumnListRow(including(campusName))
        .find(MultiColumnListCell({ columnIndex }))
        .find(Link())
        .click(),
    );
  },
};
