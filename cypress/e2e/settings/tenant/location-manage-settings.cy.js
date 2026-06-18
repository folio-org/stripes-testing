import uuid from 'uuid';
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
      testData.institution = Institutions.getDefaultInstitution({
        id: uuid(),
        name: `1_autotest_institution_${getRandomPostfix()}`,
      });
      testData.campus = Campuses.getDefaultCampuse({
        id: uuid(),
        name: `1_autotest_campuse_${getRandomPostfix()}`,
        institutionId: testData.institution.id,
      });
      testData.library = Libraries.getDefaultLibrary({
        id: uuid(),
        name: `1_autotest_library_${getRandomPostfix()}`,
        campusId: testData.campus.id,
      });
      Institutions.createViaApi(testData.institution).then(() => {
        Campuses.createViaApi(testData.campus).then(() => {
          Libraries.createViaApi(testData.library);
        });
      });
    });

    cy.createTempUser([Permissions.uiTenantSettingsSettingsLocation.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    // Failsafe: delete UI-created location if not deleted by the test
    [locationData.folioName, locationData.editedFolioName].forEach((name) => {
      cy.getLocations({ query: `name=="${name}"` }).then((res) => {
        if (res) Locations.deleteLocationViaApi(res.id);
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

      // Step 7.1: Select institution, campus, library
      Locations.selectOption('Institution', testData.institution);
      Locations.selectOption('Campus', testData.campus);
      Locations.selectOption('Library', testData.library);

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
      cy.wait(3000); // need to wait for form to be loaded
      CreateLocations.fillFolioName(locationData.editedFolioName);
      CreateLocations.fillCode(locationData.editedCode);
      CreateLocations.saveAndClose();
      LocationDetails.checkLocationDetails({
        folioName: locationData.editedFolioName,
        code: locationData.editedCode,
      });

      // DELETE: Delete the edited location
      Locations.openLocationDetails(locationData.editedFolioName);
      Locations.deleteLocation(locationData.editedFolioName);
      InteractorsTools.checkCalloutMessage(
        `The Location ${locationData.editedFolioName} was successfully deleted.`,
      );
    },
  );
});
