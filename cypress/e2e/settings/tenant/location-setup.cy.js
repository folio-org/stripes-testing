import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';

describe('Settings: Location', () => {
  const testData = {
    servicePoint: ServicePoints.defaultServicePoint,
    user: {},
    location: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint);
      testData.location = Location.getDefaultLocation(testData.servicePoint.id);
      Location.createViaApi(testData.location);
    });

    cy.createTempUser([Permissions.settingsTenantViewLocation.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.tenantPath,
        waiter: TenantPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.location.institutionId,
      testData.location.campusId,
      testData.location.libraryId,
      testData.location.id,
    );
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C365628 Settings (tenant): View locations (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
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
      const Locations = TenantPane.selectTenant(TENANTS.LOCATIONS);
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
