import uuid from 'uuid';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import {
  Locations,
  Libraries,
  Campuses,
  Institutions,
} from '../../../support/fragments/settings/tenant/location-setup';
import LocationDetails from '../../../support/fragments/settings/tenant/locations/locationDetails';
import LocationEditForm from '../../../support/fragments/settings/tenant/locations/locationEditForm';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Settings: Location', () => {
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

      const location = NewLocation.getDefaultLocation(testData.servicePoints[0].id);

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
        path: SettingsMenu.tenantLocationsPath,
        waiter: Locations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
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
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      Locations.viewLocations(testData.locations[0]);

      // Edit first location in the list, Update the "Service point", Click "Save & Close" button
      Locations.editLocation(testData.locations[0].name, {
        servicePoint: testData.servicePoints[1].name,
      });
      LocationDetails.checkLocationDetails({ servicePoints: testData.servicePoints[1].name });

      // Edit second location in the list, Update the "Service point", Click "Save & Close" button
      Locations.editLocation(testData.locations[1].name, {
        servicePoint: testData.servicePoints[1].name,
      });
      LocationDetails.checkLocationDetails({ servicePoints: testData.servicePoints[1].name });

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
