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

describe('Settings: Tenant', () => {
  const testData = {
    servicePoint: {},
    user: {},
    institutions: [],
    campuses: [],
    libraries: [],
    locations: [],
  };

  const createLocations = ({ institutions, campuses, service }) => {
    ServicePoints.createViaApi(service).then(({ body: servicePoint }) => {
      testData.servicePoint = servicePoint;

      institutions.forEach(() => {
        Institutions.createViaApi().then((institution) => {
          testData.institutions.push(institution);

          campuses.forEach(() => {
            Campuses.createViaApi({
              ...Campuses.getDefaultCampuse(),
              institutionId: institution.id,
            }).then((campus) => {
              testData.campuses.push(campus);

              Libraries.createViaApi({
                ...Libraries.getDefaultLibrary(),
                campusId: campus.id,
              }).then((library) => {
                testData.libraries.push(library);

                Locations.createViaApi({
                  ...Locations.getDefaultLocation({
                    institutionId: institution.id,
                    campusId: campus.id,
                    libraryId: library.id,
                    servicePointId: servicePoint.id,
                  }),
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
      createLocations({
        institutions: ['Institution AB', 'Institution CD'],
        campuses: ['Campus A', 'Campus B'],
        service: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      });
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
    'C399077 Verify that selected settings remain for "Libraries" (firebird)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      // #1 Step
      let pane = TenantPane.selectTenant(TENANTS.LIBRARIES);
      pane.checkEmptyTableContent();
      pane.selectOption('Institution', testData.institutions[0]);
      pane.checkEmptyTableContent();

      // #2 Step
      pane = TenantPane.selectTenant(TENANTS.CAMPUSES);
      pane.checkEmptyTableContent();
      pane.selectOption('Institution', testData.institutions[0]);
      pane.checkResultsTableContent([testData.campuses[0], testData.campuses[1]]);

      // #3 Step
      pane = TenantPane.selectTenant(TENANTS.LIBRARIES);
      pane.checkOptionSelected('Institution', testData.institutions[0]);
      pane.checkEmptyTableContent();

      // #4 Step
      pane.selectOption('Campus', testData.campuses[0]);
      pane.checkResultsTableContent([testData.libraries[0]]);

      // #5 Step
      pane = TenantPane.selectTenant(TENANTS.LOCATIONS);
      pane.selectOption('Institution', testData.institutions[0]);
      pane.selectOption('Campus', testData.campuses[0]);
      pane.selectOption('Library', testData.libraries[0]);
      pane.checkResultsTableContent([testData.locations[0]]);

      // #6 Step
      pane = TenantPane.selectTenant(TENANTS.LIBRARIES);
      pane.checkOptionSelected('Institution', testData.institutions[0]);
      pane.checkOptionSelected('Campus', testData.campuses[0]);
      pane.checkResultsTableContent([testData.libraries[0]]);

      // #7 Step
      pane.selectOption('Campus', testData.campuses[1]);
      pane.checkResultsTableContent([testData.libraries[1]]);

      // #8 Step
      cy.visit(TopMenu.inventoryPath);
      Inventory.waitContentLoading();
      cy.visit(SettingsMenu.tenantLibrariesPath);
      Libraries.waitLoading();
      pane.checkResultsTableContent([testData.libraries[1]]);

      // #9 Step
      pane.selectOption('Institution', testData.institutions[1]);
      pane.selectOption('Campus', testData.campuses[2]);
      pane.checkResultsTableContent([testData.libraries[2]]);

      // #10 Step
      pane = TenantPane.selectTenant(TENANTS.INSTITUTIONS);
      pane = TenantPane.selectTenant(TENANTS.LIBRARIES);
      pane.checkOptionSelected('Campus', testData.campuses[2]);
      pane.checkResultsTableContent([testData.libraries[2]]);

      // #11 Step
      pane.selectOption('Campus', testData.campuses[3]);
      pane.checkResultsTableContent([testData.libraries[3]]);
    },
  );
});
