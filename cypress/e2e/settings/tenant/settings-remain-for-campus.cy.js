import uuid from 'uuid';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import Libraries from '../../../support/fragments/settings/tenant/location-setup/libraries';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import getRandomPostfix from '../../../support/utils/stringTools';

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
          name: `autotest_institution ${getRandomPostfix()}`,
        });

        Institutions.createViaApi(institution).then((locinst) => {
          testData.institutions.push(locinst);
          [...Array(2)].forEach(() => {
            const campus = Campuses.getDefaultCampuse({
              name: `autotest_campus ${getRandomPostfix()}`,
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
                    code: `autotest_location_code-${getRandomPostfix()}`,
                    name: `autotest_location_name-${getRandomPostfix()}`,
                    isActive: true,
                    institutionId: locinst.id,
                    campusId: loccamp.id,
                    libraryId: loclib.id,
                    discoveryDisplayName: `autotest_location_discovery-${getRandomPostfix()}`,
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
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.tenantPath,
        waiter: TenantPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
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
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
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
      cy.visit(TopMenu.inventoryPath);
      InventoryInstances.waitContentLoading();

      // #11 Navigate back to the "Settings" -> "Campuses" on the "Tenant" pane
      cy.visit(SettingsMenu.tenantCampusesPath);
      //  * **"Institution CD"** from Preconditions #1 is displayed in "Institution" dropdown
      Campuses.checkOptionSelected('Institution', testData.institutions[1]);
      //  * **"Campus C"** and **"Campus D"** records are displayed in "Campuses" table
      Campuses.checkResultsTableContent([testData.campuses[2], testData.campuses[3]]);
    },
  );
});
