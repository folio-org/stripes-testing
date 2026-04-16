import uuid from 'uuid';
import { Locations, ServicePoints } from '../../../../../support/fragments/settings/tenant';
import TenantPane, { TENANTS } from '../../../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Campuses from '../../../../../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../../../../../support/fragments/settings/tenant/location-setup/institutions';
import Libraries from '../../../../../support/fragments/settings/tenant/location-setup/libraries';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Settings: Tenant', () => {
  const { user, memberTenant } = parseSanityParameters();
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    location: {},
  };

  before('Setup', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false })
      .then(() => {
        // Fetch user details
        cy.getUserDetailsByUsername(user.username).then((details) => {
          user.id = details.id;
          user.personal = details.personal;
          user.barcode = details.barcode;
        });
      })
      .then(() => {
        // Create test data
        testData.institution = Institutions.getDefaultInstitution({
          id: uuid(),
          name: `AT_C365628_autotest_institution_${getRandomPostfix()}`,
        });
        testData.campus = Campuses.getDefaultCampuse({
          id: uuid(),
          name: `AT_C365628_autotest_campuse_${getRandomPostfix()}`,
          institutionId: testData.institution.id,
        });
        testData.library = Libraries.getDefaultLibrary({
          id: uuid(),
          name: `AT_C365628_autotest_library_${getRandomPostfix()}`,
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
          name: `AT_C365628_autotest_location_name_${getRandomPostfix()}`,
          code: `AT_C365628_autotest_location_code_${getRandomPostfix()}`,
          discoveryDisplayName: `AT_C365628_autotest_name_${getRandomPostfix()}`,
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
  });

  after('Cleanup', () => {
    cy.getUserToken(user.username, user.password, { log: false });
    cy.setTenant(memberTenant.id);
    if (testData.location && testData.location.id) {
      Locations.deleteViaApi(testData.location);
    }
    if (testData.servicePoint && testData.servicePoint.id) {
      ServicePoints.deleteViaApi(testData.servicePoint.id);
    }
  });

  it(
    'C365628 Settings (tenant): View locations (firebird) (TaaS)',
    { tags: ['dryRun', 'firebird', 'C365628'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password);
      cy.allure().logCommandSteps(true);
      cy.wait(2000);
      TopMenuNavigation.navigateToAppAdaptive('Settings');
      TenantPane.goToTenantTab();

      cy.intercept('/location-units/institutions*', { locinsts: [testData.institution] });
      // Select "Institutions" option on the "Location setup" subsection
      TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      // Institutions.checkNoActionButtons(); don't verify because the user with "adminRole" role can have permissions to manage institutions

      // Select "Campuses" option on the "Location setup" subsection
      // Select any existing institution from the  "Select institution" dropdown
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      Campuses.selectOption('Institution', {
        name: testData.location.institutionName,
        id: testData.location.institutionId,
      });
      // Campuses.checkNoActionButtons(); // don't verify because the user with "adminRole" role can have permissions to manage campuses

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
      // Libraries.checkNoActionButtons(); // don't verify because the user with "adminRole" role can have permissions to manage libraries

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
      // Locations.checkNoActionButtons(); // don't verify because the user with "adminRole" role can have permissions to manage locations
    },
  );
});
