import { Permissions } from '../../../support/dictionary';
import {
  Campuses,
  Institutions,
  Libraries,
  Locations,
  ServicePoints,
} from '../../../support/fragments/settings/tenant';
import CreateLocations from '../../../support/fragments/settings/tenant/locations/createLocations';
import LocationDetails from '../../../support/fragments/settings/tenant/locations/locationDetails';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Settings: Tenant', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };

  const locationData = {
    folioName: `autotest_location_${getRandomPostfix()}`,
    code: `AT_C517_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_display_${getRandomPostfix()}`,
    editedFolioName: `autotest_location_edited_${getRandomPostfix()}`,
    editedCode: `AT_C517_ED_${getRandomPostfix()}`,
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint);
      const { institution, campus, library, location } = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      });
      testData.institution = institution;
      testData.campus = campus;
      testData.library = library;
      testData.location = location;
      Locations.createViaApi(testData.location);
    });

    cy.createTempUser([Permissions.uiTenantSettingsSettingsLocation.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Locations.deleteViaApi({ id: testData.location.id });
    // Failsafe: delete UI-created location if not deleted by the test
    [locationData.folioName, locationData.editedFolioName].forEach((name) => {
      cy.okapiRequest({
        path: 'locations',
        searchParams: { query: `name=="${name}"` },
        isDefaultSearchParamsRequired: false,
      }).then(({ body }) => {
        (body.locations || []).forEach(({ id }) => Locations.deleteLocationViaApi(id));
      });
    });
    Libraries.deleteViaApi(testData.library.id);
    Campuses.deleteViaApi(testData.campus.id);
    Institutions.deleteViaApi(testData.institution.id);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C517 Settings - UI-Tenant-Settings Settings Location - Manage (firebird)',
    { tags: ['extendedPath', 'firebird', 'C517'] },
    () => {
      // Navigate to Settings > Tenant > Locations
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      Locations.openLTabFromSettingsList();

      // Step 7.1: Select institution, campus, library; verify list of locations
      Locations.selectOption('Institution', testData.institution);
      Locations.selectOption('Campus', testData.campus);
      Locations.selectOption('Library', testData.library);
      Locations.checkLocationsTableContent([testData.location]);

      // CREATE: Add a new location
      Locations.createNewLocation();
      CreateLocations.fillFolioName(locationData.folioName);
      CreateLocations.fillCode(locationData.code);
      CreateLocations.fillDiscoveryDisplayName(locationData.discoveryDisplayName);
      CreateLocations.selectServicePoint(testData.servicePoint.name);
      CreateLocations.saveAndClose();
      LocationDetails.checkLocationDetails({
        folioName: locationData.folioName,
        code: locationData.code,
        discoveryDisplayName: locationData.discoveryDisplayName,
      });

      // UPDATE: Edit the created location
      LocationDetails.openEditLocationForm();
      CreateLocations.fillFolioName(locationData.editedFolioName);
      CreateLocations.fillCode(locationData.editedCode);
      CreateLocations.saveAndClose();
      LocationDetails.checkLocationDetails({
        folioName: locationData.editedFolioName,
        code: locationData.editedCode,
      });

      // DELETE: Delete the edited location
      Locations.deleteLocation(locationData.editedFolioName);
      InteractorsTools.checkCalloutMessage(
        `The Location ${locationData.editedFolioName} was successfully deleted.`,
      );
    },
  );
});
