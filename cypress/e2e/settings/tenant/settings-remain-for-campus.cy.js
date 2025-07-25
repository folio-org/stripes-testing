import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import Libraries from '../../../support/fragments/settings/tenant/location-setup/libraries';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('Settings: Tenant', () => {
  const testData = {
    servicePoint: {},
    user: {},
    institutions: [],
    campuses: [],
    libraries: [],
    locations: [],
  };

  const createTestData = () => {
    const service = ServicePoints.getDefaultServicePoint();
    ServicePoints.createViaApi(service).then(({ body: servicePoint }) => {
      testData.servicePoint = servicePoint;

      [...Array(2)].forEach(() => {
        const institution = Institutions.getDefaultInstitution({
          name: `1_autotest_institution ${getRandomPostfix()}`,
        });

        Institutions.createViaApi(institution).then((locinst) => {
          testData.institutions.push(locinst);
          [...Array(2)].forEach(() => {
            const campus = Campuses.getDefaultCampuse({
              name: `1_autotest_campus ${getRandomPostfix()}`,
              institutionId: locinst.id,
            });

            Campuses.createViaApi(campus).then((loccamp) => {
              testData.campuses.push(loccamp);
              const library = Libraries.getDefaultLibrary({ campusId: loccamp.id });

              Libraries.createViaApi(library).then((loclib) => {
                testData.libraries.push(loclib);
                // No one Location should be assigned to "Library B"
                if (testData.libraries.length !== 2) {
                  Locations.createViaApi({
                    id: uuid(),
                    code: `1_autotest_location_code-${getRandomPostfix()}`,
                    name: `1_autotest_location_name-${getRandomPostfix()}`,
                    isActive: true,
                    institutionId: locinst.id,
                    campusId: loccamp.id,
                    libraryId: loclib.id,
                    discoveryDisplayName: `1_autotest_location_discovery-${getRandomPostfix()}`,
                    servicePointIds: [servicePoint.id],
                    primaryServicePoint: servicePoint.id,
                  }).then((location) => {
                    testData.locations.push(location);
                  });
                }
              });
            });
          });
        });
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createTestData();
    });

    cy.createTempUser([
      Permissions.uiTenantSettingsSettingsLocation.gui,
      Permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password);
      cy.wait(2000);
      TopMenuNavigation.navigateToApp('Settings');
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.locations.forEach(({ id }) => {
      Locations.deleteViaApi({ id });
    });
    testData.libraries.forEach(({ id }) => {
      Libraries.deleteViaApi(id);
    });
    testData.campuses.forEach(({ id }) => {
      Campuses.deleteViaApi(id);
    });
    testData.institutions.forEach(({ id }) => {
      Institutions.deleteViaApi(id);
    });
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C397997 Verify that selected settings remain for "Campuses" (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird', 'C397997'] },
    () => {
      TenantPane.goToTenantTab();
      cy.intercept('/location-units/institutions*', { locinsts: testData.institutions });
      // #1 Select **"Institution AB"** from Preconditions #1 in "Institution" dropdown on "Campuses" pane
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      Campuses.checkEmptyTableContent();
      Campuses.selectOption('Institution', testData.institutions[0]);
      // * **"Campus A"** and **"Campus B"** records are displayed in "Campuses" table
      Campuses.checkResultsTableContent([testData.campuses[0], testData.campuses[1]]);

      // #2 Select "Libraries" option on the "Tenant" pane
      TenantPane.selectTenant(TENANTS.LIBRARIES);
      // #3 Select **"Institution AB"** from Preconditions #1 in "Institution" dropdown on "Libraries" pane
      Libraries.selectOption('Institution', testData.institutions[0]);
      // #4 Select **"Campus A"** in the "Campus" dropdown
      Libraries.selectOption('Campus', testData.campuses[0]);
      // * **"Library A"** is displayed in "Libraries" table
      Libraries.checkResultsTableContent([testData.libraries[0]]);

      // #5 Navigate back to the "Campuses" option on the "Tenant" pane
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      //  * **"Institution AB"** from Preconditions #1 is displayed in "Institution" dropdown
      Campuses.checkOptionSelected('Institution', testData.institutions[0]);
      //  * **"Campus A"** and **"Campus B"** records are displayed in "Campuses" table
      Campuses.checkResultsTableContent([testData.campuses[0], testData.campuses[1]]);

      // #6 Select **"Institution CD"** from Preconditions #1 in "Institution" dropdown on "Campuses" pane
      Campuses.selectOption('Institution', testData.institutions[1]);
      // * **"Campus C"** and **"Campus D"** records are displayed in "Campuses" table
      Campuses.checkResultsTableContent([testData.campuses[2], testData.campuses[3]]);

      // #7 Select "Locations" option on the "Tenant" pane
      TenantPane.selectTenant(TENANTS.LOCATIONS);
      // #8 Select **"Institution CD"** from Preconditions #1 in "Institution" dropdown on "Locations" pane
      Locations.selectOption('Institution', testData.institutions[1]);
      // Select **Campus C** from Preconditions #3 in "Campuses" dropdown on "Locations" pane
      Locations.selectOption('Campus', testData.campuses[2]);
      // Select **"Library C"** from Preconditions #7 in ""Libraries"" dropdown on "Locations" pane
      Locations.selectOption('Library', testData.libraries[2]);
      Locations.checkResultsTableContent([testData.locations[1]]);

      // #9 Navigate back to the "Campuses" option on the "Tenant" pane
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      //  * **"Institution CD"** from Preconditions #1 is displayed in "Institution" dropdown
      Campuses.checkOptionSelected('Institution', testData.institutions[1]);
      //  * **"Campus C"** and **"Campus D"** records are displayed in "Campuses" table
      Campuses.checkResultsTableContent([testData.campuses[2], testData.campuses[3]]);

      // #10 Navigated to the "Inventory" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.waitContentLoading();

      // #11 Navigate back to the "Settings" -> "Campuses" on the "Tenant" pane
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      //  * **"Institution CD"** from Preconditions #1 is displayed in "Institution" dropdown
      Campuses.checkOptionSelected('Institution', testData.institutions[1]);
      //  * **"Campus C"** and **"Campus D"** records are displayed in "Campuses" table
      Campuses.checkResultsTableContent([testData.campuses[2], testData.campuses[3]]);
    },
  );
});
