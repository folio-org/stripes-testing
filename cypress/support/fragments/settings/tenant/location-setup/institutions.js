import TenantPane, { getDefaultTenant as getDefaultInstitutions } from '../baseTenantPane';

export default {
  ...TenantPane,
  waitLoading() {
    TenantPane.waitLoading('Institutions');
  },
  getDefaultInstitutions,
  defaultUiInstitutions: {
    body: getDefaultInstitutions(),
  },
  createViaApi: (institutionsProperties) => {
    return TenantPane.createViaApi({
      path: 'location-units/institutions',
      body: institutionsProperties,
    });
  },
  deleteViaApi: (institutionId) => {
    return TenantPane.deleteViaApi({
      path: `location-units/institutions/${institutionId}`,
    });
  },
};
