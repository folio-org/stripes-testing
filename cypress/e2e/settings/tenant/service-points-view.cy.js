import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import {
  Campuses,
  Institutions,
  Libraries,
  Locations,
} from '../../../support/fragments/settings/tenant/location-setup';
import LocationDetails from '../../../support/fragments/settings/tenant/locations/locationDetails';
import LocationEditForm from '../../../support/fragments/settings/tenant/locations/locationEditForm';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsPane from '../../../support/fragments/settings/settingsPane';

describe('Settings: Tenant', () => {
  const testData = {
    servicePoints: [ServicePoints.getDefaultServicePoint(), ServicePoints.getDefaultServicePoint()],
    user: {},
    locations: [],
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      testData.servicePoints.forEach((servicePoint) => {
        ServicePoints.createViaApi(servicePoint);
      });

      const location = {
        id: uuid(),
        isActive: true,
        institutionId: uuid(),
        institutionName: `11_autotest_institution_${getRandomPostfix()}`,
        campusId: uuid(),
        campusName: `11_autotest_campuse_${getRandomPostfix()}`,
        libraryId: uuid(),
        libraryName: `11_autotest_library_${getRandomPostfix()}`,
        servicePointIds: [testData.servicePoints[0].id],
        name: `11_autotest_location_name_${getRandomPostfix()}`,
        code: `11_autotest_location_code_${getRandomPostfix()}`,
        discoveryDisplayName: `11_autotest_name_${getRandomPostfix()}`,
        primaryServicePoint: testData.servicePoints[0].id,
      };

      Institutions.createViaApi(
        Institutions.getDefaultInstitution({
          id: location.institutionId,
          name: location.institutionName,
        }),
      ).then(() => {
        Campuses.createViaApi(
          Campuses.getDefaultCampuse({
            id: location.campusId,
            name: location.campusName,
            institutionId: location.institutionId,
          }),
        ).then(() => {
          Libraries.createViaApi(
            Libraries.getDefaultLibrary({
              id: location.libraryId,
              name: location.libraryName,
              campusId: location.campusId,
            }),
          );
        });
      });

      [...Array(3).keys()].forEach((index) => {
        testData.locations.push({
          ...location,
          id: uuid(),
          name: `${location.name} [${index}]`,
          code: `${location.code} [${index}]`,
        });
        NewLocation.createViaApi(testData.locations[index]);
      });
    });

    cy.createTempUser([Permissions.uiTenantSettingsSettingsLocation.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });

      Locations.goToLocationsTab();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.locations.forEach(({ id }) => {
      Locations.deleteViaApi({ id });
    });
    Libraries.deleteViaApi(testData.locations[0].libraryId);
    Campuses.deleteViaApi(testData.locations[0].campusId);
    Institutions.deleteViaApi(testData.locations[0].institutionId);
    testData.servicePoints.forEach(({ id }) => {
      ServicePoints.deleteViaApi(id);
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C359588 Verify view of services points on the view page (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird', 'C359588', 'eurekaPhase1'] },
    () => {
      Locations.viewLocations(testData.locations[0]);

      // Edit first location in the list, Update the "Service point", Click "Save & Close" button
      Locations.editLocation(testData.locations[0].name, {
        servicePoint: testData.servicePoints[1].name,
      });
      cy.wait(2000);
      LocationDetails.checkLocationDetails({ servicePoints: testData.servicePoints[1].name });

      // Edit second location in the list, Update the "Service point", Click "Save & Close" button
      Locations.editLocation(testData.locations[1].name, {
        servicePoint: testData.servicePoints[1].name,
      });
      cy.wait(2000);
      LocationDetails.checkLocationDetails({ servicePoints: testData.servicePoints[1].name });
      cy.wait(1000);

      // Select the secondlocation, Open Edit form, Check "Service point" dropdown
      LocationDetails.openEditLocationForm();
      // The "Service point" in edit mode of current location is the same as in the view page of current location
      LocationEditForm.checkLocationDetails({ servicePoint: testData.servicePoints[1].name });
      // Click "Cancel" on the view page
      LocationEditForm.clickCancelButton();

      // Select locations that was not modified
      Locations.openLocationDetails(testData.locations[2].name);
      // The "Service point" in edit mode is the same as in the view page
      LocationDetails.checkLocationDetails({ servicePoints: testData.servicePoints[0].name });
      LocationDetails.openEditLocationForm();
      LocationEditForm.checkLocationDetails({ servicePoint: testData.servicePoints[0].name });

      // Refresh the page, Go to "Locations"
      cy.visit(SettingsMenu.tenantLocationsPath);
      Locations.viewLocations(testData.locations[0]);

      // Make sure that the associated service point in the view pane on the right correspond to service point in the edit mode for each location
      Locations.openLocationDetails(testData.locations[0].name);
      LocationDetails.checkLocationDetails({ servicePoints: testData.servicePoints[1].name });

      Locations.openLocationDetails(testData.locations[1].name);
      LocationDetails.checkLocationDetails({ servicePoints: testData.servicePoints[1].name });

      Locations.openLocationDetails(testData.locations[2].name);
      LocationDetails.checkLocationDetails({ servicePoints: testData.servicePoints[0].name });
    },
  );
});
