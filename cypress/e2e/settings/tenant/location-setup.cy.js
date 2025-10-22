import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import Libraries from '../../../support/fragments/settings/tenant/location-setup/libraries';
import getRandomPostfix from '../../../support/utils/stringTools';

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
        testData.institution = Institutions.getDefaultInstitution({
          id: uuid(),
          name: `11_autotest_institution_${getRandomPostfix()}`,
        });
        testData.campus = Campuses.getDefaultCampuse({
          id: uuid(),
          name: `11_autotest_campuse_${getRandomPostfix()}`,
          institutionId: testData.institution.id,
        });
        testData.library = Libraries.getDefaultLibrary({
          id: uuid(),
          name: `1_autotest_library_${getRandomPostfix()}`,
          campusId: testData.campus.id,
        });
        testData.location = {
          id: uuid(),
          isActive: true,
          institutionId: testData.institution.id,
          institutionName: testData.institution.name,
          campusId: testData.campus.id,
          campusName: testData.campus.name,
          libraryId: testData.library.id,
          libraryName: testData.library.name,
          servicePointIds: [testData.servicePoint.id],
          name: `1_autotest_location_name_${getRandomPostfix()}`,
          code: `1_autotest_location_code_${getRandomPostfix()}`,
          discoveryDisplayName: `1_autotest_name_${getRandomPostfix()}`,
          primaryServicePoint: testData.servicePoint.id,
        };

        Institutions.createViaApi(testData.institution).then(() => {
          Campuses.createViaApi(testData.campus).then(() => {
            Libraries.createViaApi(testData.library);
          });
        });

        ServicePoints.createViaApi(testData.servicePoint);
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
      TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      Institutions.checkNoActionButtons();

      // Select "Campuses" option on the "Location setup" subsection
      // Select any existing institution from the  "Select institution" dropdown
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      Campuses.selectOption('Institution', {
        name: testData.location.institutionName,
        id: testData.location.institutionId,
      });
      Campuses.checkNoActionButtons();

      // Select "Libraries" option on the "Location setup" subsection
      // Select any existing institution from the  "Select institution" dropdown
      TenantPane.selectTenant(TENANTS.LIBRARIES);
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
