import { Permissions } from '../../../support/dictionary';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Settings: Tenant', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    user: {},
    location: {},
  };

  before('Create test data', () => {
    cy.createTempUser([Permissions.settingsTenantViewLocation.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        const { institution, location } = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        });
        testData.institution = institution;
        testData.location = location;
        Locations.createViaApi(testData.location);
      });

      cy.login(testData.user.username, testData.user.password);
      cy.wait(2000);
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
    'C365628 Settings (tenant): View locations (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird', 'C365628'] },
    () => {
      cy.intercept('/location-units/institutions*', { locinsts: [testData.institution] });
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
