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
  checkResultsTableContent(records) {
    TenantPane.checkResultsTableColumns([
      'Institution',
      'Code',
      'Last updated',
      '# of Campuses',
      'Actions',
    ]);
    TenantPane.checkResultsTableContent(records);
  },
  // checkEmptyTableContent() {
  //   TenantPane.checkEmptyTableContent('Please select an institution and campus to continue.');
  // },
  getViaApi() {
    return TenantPane.getViaApi({ path: 'location-units/institutions' });
  },
  createViaApi(institutionsProperties = getDefaultInstitutions()) {
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
