import uuid from 'uuid';
import TenantPane, { getDefaultTenant } from '../baseTenantPane';

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
};
