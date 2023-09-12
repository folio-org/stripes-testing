import uuid from 'uuid';
import TenantPane, { getDefaultTenant } from '../baseTenantPane';

const selectInstitution = () => TenantPane.selectOption('Institution', 'KU');

export default {
  ...TenantPane,
  waitLoading() {
    TenantPane.waitLoading('Campuses');
  },
  viewTable() {
    selectInstitution();
  },
  getDefaultCampuse() {
    return getDefaultTenant({ institutionId: '' });
  },
  defaultUiCampuses: {
    body: getDefaultTenant({ institutionId: uuid() }),
  },
  createViaApi: (campusesProperties) => {
    return TenantPane.createViaApi({
      path: 'location-units/campuses',
      body: campusesProperties,
    });
  },
  deleteViaApi: (campusId) => {
    return TenantPane.deleteViaApi({
      path: `location-units/campuses/${campusId}`,
    });
  },
};
