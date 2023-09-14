import uuid from 'uuid';
import TenantPane, { getDefaultTenant } from '../baseTenantPane';

const selectInstitution = () => TenantPane.selectOption('Institution', 'KU');

const selectCampus = () => TenantPane.selectOption('Campus', '(E)');

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
  viewTable() {
    selectInstitution();
    selectCampus();
  },
  getDefaultLibrary({ id, campusId } = {}) {
    return getDefaultTenant({ id, campusId });
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
};
