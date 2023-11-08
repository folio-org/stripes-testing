import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Permissions -> Tenant', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };
  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    const { institution, location } = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    });
    testData.institution = institution;
    testData.location = location;
    Locations.createViaApi(testData.location);
    cy.createTempUser([Permissions.settingsTenantView.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password);
      cy.wait(3000);
      TopMenuNavigation.navigateToApp('Settings');
      TenantPane.goToTenantTab();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Locations.deleteViaApi(testData.location);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C409487 Settings (tenant): View -- Location setup (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      cy.intercept('/location-units/institutions*', { locinsts: [testData.institution] });
      // reload is needed because sometimes Location setup section is not displayed
      cy.reload();
      // Select "Institutions" option on the "Location setup" subsection
      const Institutions = TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      Institutions.checkNoActionButtons();

      // Select "Campuses" option on the "Location setup" subsection
      // Select any existing institution from the  "Select institution" dropdown
      const Campuses = TenantPane.selectTenant(TENANTS.CAMPUSES);
      Campuses.selectOption('Institution', {
        name: testData.location.institutionName,
        id: testData.location.institutionId,
      });
      Campuses.checkNoActionButtons();

      // Select "Libraries" option on the "Location setup" subsection
      // Select any existing institution from the  "Select institution" dropdown
      const Libraries = TenantPane.selectTenant(TENANTS.LIBRARIES);
      Libraries.selectOption('Institution', {
        name: testData.location.institutionName,
        id: testData.location.institutionId,
      });
      // Select any existing campus from the  "Select campus" dropdown
      Libraries.selectOption('Campus', {
        name: testData.location.campusName,
        id: testData.location.campusId,
      });
      Libraries.checkNoActionButtons();

      // Select "Locations" option on the "Location setup" subsection
      // Select any existing institution from the  "Select institution" dropdown
      TenantPane.selectTenant(TENANTS.LOCATIONS);
      Locations.selectOption('Institution', {
        name: testData.location.institutionName,
        id: testData.location.institutionId,
      });
      // Select any existing campus from the  "Select campus" dropdown
      Locations.selectOption('Campus', {
        name: testData.location.campusName,
        id: testData.location.campusId,
      });
      // Select any existing library from the  "Select library" dropdown
      Locations.selectOption('Library', {
        name: testData.location.libraryName,
        id: testData.location.libraryId,
      });
      Locations.checkNoActionButtons();
    },
  );
});
