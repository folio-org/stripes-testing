import uuid from 'uuid';
import TenantPane, { getDefaultTenant } from '../baseTenantPane';

const selectInstitution = () => TenantPane.selectOption('Institution', 'KU');

const selectCampus = () => TenantPane.selectOption('Campus', '(E)');

export default {
  ...TenantPane,
  waitLoading() {
    TenantPane.waitLoading('Libraries');
  },
  viewTable() {
    selectInstitution();
    selectCampus();
  },
  getDefaultLibrary() {
    return getDefaultTenant({ campusId: uuid() });
  },
  defaultUiLibraries: {
    body: getDefaultTenant({ campusId: uuid() }),
  },
  createViaApi: (librariesProperties) => {
    return TenantPane.createViaApi({
      path: 'location-units/libraries',
      body: librariesProperties,
    });
  },
  deleteViaApi: (libraryId) => {
    return TenantPane.deleteViaApi({
      path: `location-units/libraries/${libraryId}`,
    });
  },
};
