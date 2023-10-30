import { including, Link } from '@interactors/html';

import TenantPane, { getDefaultTenant as getDefaultInstitution } from '../baseTenantPane';
import { MultiColumnListCell, MultiColumnListRow } from '../../../../../../interactors';

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
  clickOnCampusesHyperlink(institution) {
    cy.do(
      MultiColumnListRow(including(institution))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Link())
        .click(),
    );
  },
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
