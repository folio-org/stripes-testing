import TenantPane, { getDefaultTenant as getDefaultInstitution } from '../baseTenantPane';

export default {
  ...TenantPane,
  waitLoading() {
    TenantPane.waitLoading('Institutions');
  },
  getDefaultInstitution,
  defaultUiInstitutions: {
    body: getDefaultInstitution(),
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
  createViaApi(institutionsProperties = getDefaultInstitution()) {
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
  getInstitutionByIdViaApi(id) {
    return cy
      .okapiRequest({
        path: `location-units/institutions/${id}`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
};
