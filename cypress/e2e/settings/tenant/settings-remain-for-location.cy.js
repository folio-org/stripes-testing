import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import Campuses from '../../../support/fragments/settings/tenant/location-setup/campuses';
import Institutions from '../../../support/fragments/settings/tenant/location-setup/institutions';
import Libraries from '../../../support/fragments/settings/tenant/location-setup/libraries';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
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
          name: `1_autotest_institution ${getRandomPostfix()}`,
        });

        Institutions.createViaApi(institution).then((locinst) => {
          testData.institutions.push(locinst);
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
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createTestData();
    });

    cy.createTempUser([
      Permissions.uiTenantSettingsSettingsLocation.gui,
      Permissions.uiInventoryViewInstances.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password);
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
    'C399083 Verify that selected settings remain for "Locations" (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird', 'C399083'] },
    () => {
      cy.intercept('/location-units/institutions*', { locinsts: testData.institutions });
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      Locations.openLTabFromSettingsList();
      // #1 Select **"Institution A"** from Preconditions #1 in "Institution" dropdown on "Locations" pane
      Locations.selectOption('Institution', testData.institutions[0]);
      Locations.checkEmptyTableContent();

      // #2 Select "Institutions" option on the "Tenant" pane => Navigate back to the "Locations" option on the "Tenant" pane
      TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      TenantPane.selectTenant(TENANTS.LOCATIONS);
      Locations.checkOptionSelected('Institution', testData.institutions[0]);
      Locations.checkEmptyTableContent();

      // #3 Select **"Campus A"** from Preconditions #2 in the "Campus" dropdown
      Locations.selectOption('Campus', testData.campuses[0]);
      Locations.checkEmptyTableContent();

      // #4 Select "Campuses" option on the "Tenant" pane
      // Select **"Institution A"** from Preconditions #1 in "Institution" dropdown on "Campuses" pane
      TenantPane.selectTenant(TENANTS.CAMPUSES);
      Campuses.selectOption('Institution', testData.institutions[0]);
      Campuses.checkResultsTableContent([testData.campuses[0]]);

      // #5 Navigate back to the "Locations" option on the "Tenant" pane
      TenantPane.selectTenant(TENANTS.LOCATIONS);
      Locations.checkOptionSelected('Institution', testData.institutions[0]);
      Locations.checkOptionSelected('Campus', testData.campuses[0]);
      Locations.checkEmptyTableContent();

      // #6 Select **"Library A"** from Preconditions #4 in the "Library" dropdown
      Locations.selectOption('Library', testData.libraries[0]);
      Locations.checkResultsTableContent([testData.locations[0]]);

      // #7 Select "Libraries" option on the "Tenant" pane
      // Select **"Institution A"** from Preconditions #1 in "Institution" dropdown on "Libraries" pane
      // Select **"Campus A"** from Preconditions #2 in the "Campus" dropdown
      TenantPane.selectTenant(TENANTS.LIBRARIES);
      Libraries.selectOption('Institution', testData.institutions[0]);
      Libraries.selectOption('Campus', testData.campuses[0]);
      Libraries.checkResultsTableContent([testData.libraries[0]]);

      // #8 Navigate back to the "Locations" option on the "Tenant" pane
      TenantPane.selectTenant(TENANTS.LOCATIONS);
      Locations.checkResultsTableContent([testData.locations[0]]);

      // #9 Select **"Institution B"** from Preconditions #1 in "Institution" dropdown on "Locations" pane
      Locations.selectOption('Institution', testData.institutions[1]);
      // Select **"Campus B"** from Preconditions #3 in the "Campus" dropdown
      Locations.selectOption('Campus', testData.campuses[1]);
      // Select **"Library B"** from Preconditions #6 in the "Library" dropdown
      Locations.selectOption('Library', testData.libraries[1]);
      Locations.checkEmptyTableContent(true);

      // #10 Navigated to the "Inventory" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.waitContentLoading();

      // #11 Navigate back to the "Settings" app -> "Tenant" -> "Locations"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      Locations.checkOptionSelected('Institution', testData.institutions[1]);
      Locations.checkOptionSelected('Campus', testData.campuses[1]);
      Locations.checkOptionSelected('Library', testData.libraries[1]);
      Locations.checkEmptyTableContent(true);
    },
  );
});
