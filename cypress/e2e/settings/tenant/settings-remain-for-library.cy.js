import uuid from 'uuid';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Inventory from '../../../support/fragments/inventory/inventoryInstances';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import {
  ServicePoints,
  Institutions,
  Campuses,
  Libraries,
  Locations,
} from '../../../support/fragments/settings/tenant';
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

  const createLocations = () => {
    const service = ServicePoints.getDefaultServicePoint();
    ServicePoints.createViaApi(service).then(({ body: servicePoint }) => {
      testData.servicePoint = servicePoint;

      [...Array(2)].forEach(() => {
        const institution = Institutions.getDefaultInstitution();

        Institutions.createViaApi(institution).then((locinst) => {
          testData.institutions.push(locinst);

          [...Array(2)].forEach(() => {
            const campus = Campuses.getDefaultCampuse({ institutionId: locinst.id });

            Campuses.createViaApi(campus).then((loccamp) => {
              testData.campuses.push(loccamp);
              const library = Libraries.getDefaultLibrary({ campusId: loccamp.id });

              Libraries.createViaApi(library).then((loclib) => {
                testData.libraries.push(loclib);

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
              });
            });
          });
        });
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createLocations();
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
    testData.locations.forEach(({ id, libraryId, campusId }) => {
      Locations.deleteViaApi({ id, libraryId, campusId });
    });
    testData.institutions.forEach(({ id }) => {
      Institutions.deleteViaApi(id);
    });
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C399077 Verify that selected settings remain for "Libraries" (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      cy.intercept('/location-units/institutions*', { locinsts: testData.institutions });
      // Select "Institution AB" in "Institution" dropdown on "Libraries" pane
      let pane = TenantPane.selectTenant(TENANTS.LIBRARIES);
      pane.checkEmptyTableContent();
      pane.selectOption('Institution', testData.institutions[0]);
      pane.checkEmptyTableContent();

      // Select "Institution AB" in "Institution" dropdown on "Campuses" pane
      pane = TenantPane.selectTenant(TENANTS.CAMPUSES);
      pane.checkEmptyTableContent();
      pane.selectOption('Institution', testData.institutions[0]);
      pane.checkResultsTableContent([testData.campuses[0], testData.campuses[1]]);

      // Navigate back to the "Libraries" option on the "Tenant" pane
      pane = TenantPane.selectTenant(TENANTS.LIBRARIES);
      pane.checkOptionSelected('Institution', testData.institutions[0]);
      pane.checkEmptyTableContent();

      // Select "Campus A" in the "Campus" dropdown
      pane.selectOption('Campus', testData.campuses[0]);
      pane.checkResultsTableContent([testData.libraries[0]]);

      // Select "Locations" option on the "Tenant" pane
      pane = TenantPane.selectTenant(TENANTS.LOCATIONS);
      // Select "Institution AB" in "Institution" dropdown on "Locations" pane
      pane.selectOption('Institution', testData.institutions[0]);
      // Select "Campus A" in the "Campus" dropdown
      pane.selectOption('Campus', testData.campuses[0]);
      // Select "Library A" in the "Library" dropdown
      pane.selectOption('Library', testData.libraries[0]);
      pane.checkResultsTableContent([testData.locations[0]]);

      // Navigate back to the "Libraries" option on the "Tenant" pane
      pane = TenantPane.selectTenant(TENANTS.LIBRARIES);
      pane.checkOptionSelected('Institution', testData.institutions[0]);
      pane.checkOptionSelected('Campus', testData.campuses[0]);
      pane.checkResultsTableContent([testData.libraries[0]]);

      // Select "Campus B" in the "Campus" dropdown
      pane.selectOption('Campus', testData.campuses[1]);
      pane.checkResultsTableContent([testData.libraries[1]]);

      // Select "Inventory" app => Navigate back to the "Settings" - "Tenant" -> "Libraries" option on the "Tenant" pane
      cy.visit(TopMenu.inventoryPath);
      Inventory.waitContentLoading();
      cy.visit(SettingsMenu.tenantLibrariesPath);
      Libraries.waitLoading();
      pane.checkResultsTableContent([testData.libraries[1]]);

      // Select "Institution CD" in "Institution" dropdown on "Libraries" pane
      pane.selectOption('Institution', testData.institutions[1]);
      // Select "Campus C" from Preconditions #3 in the "Campus" dropdown
      pane.selectOption('Campus', testData.campuses[2]);
      pane.checkResultsTableContent([testData.libraries[2]]);

      // Select "Institutions" option on the "Tenant" pane => Navigate back to the "Libraries" option on the "Tenant" pane
      pane = TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      pane = TenantPane.selectTenant(TENANTS.LIBRARIES);
      pane.checkOptionSelected('Campus', testData.campuses[2]);
      pane.checkResultsTableContent([testData.libraries[2]]);

      // Select "Campus D" in the "Campus" dropdown
      pane.selectOption('Campus', testData.campuses[3]);
      pane.checkResultsTableContent([testData.libraries[3]]);
    },
  );
});
