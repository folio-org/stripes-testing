import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import Configurations from '../../../support/fragments/settings/remote-storage/configurations';
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
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Settings: Tenant', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };

  const locationData = {
    folioName: `autotest_location_${getRandomPostfix()}`,
    code: `AT_NL_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_display_${getRandomPostfix()}`,
    detailName: `autotest_detail_name_${getRandomPostfix()}`,
    detailValue: `1_${getRandomPostfix()}`,
    duplicatedFolioName: `autotest_location_dup_${getRandomPostfix()}`,
    duplicatedCode: `AT_NL_DUP_${getRandomPostfix()}`,
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Configurations.createViaApi().then((rs1) => {
        testData.remoteStorage1 = rs1;
      });
      Configurations.createViaApi().then((rs2) => {
        testData.remoteStorage2 = rs2;
      });
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
    cy.getLocations({ query: `name=="${locationData.folioName}"` }).then((res) => {
      if (res) Locations.deleteLocationViaApi(res.id);
    });
    cy.getLocations({ query: `name=="${locationData.duplicatedFolioName}"` }).then((res) => {
      if (res) Locations.deleteLocationViaApi(res.id);
    });
    Libraries.deleteViaApi(testData.library.id);
    Campuses.deleteViaApi(testData.campus.id);
    Institutions.deleteViaApi(testData.institution.id);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    if (testData.remoteStorage1?.id) Configurations.deleteViaApi(testData.remoteStorage1.id);
    if (testData.remoteStorage2?.id) Configurations.deleteViaApi(testData.remoteStorage2.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C566501 Verify create, edit, duplicate actions for Location with remote storage (firebird)',
    { tags: ['extendedPath', 'firebird', 'C566501'] },
    () => {
      // Navigate to Settings > Tenant > Locations
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      Locations.openLTabFromSettingsList();
      Locations.selectOption('Institution', testData.institution);
      Locations.selectOption('Campus', testData.campus);
      Locations.selectOption('Library', testData.library);

      // Step 1: Click "New" button
      Locations.createNewLocation();
      CreateLocations.verifyNewFormIsOpen({
        institution: testData.institution.name,
        campus: testData.campus.name,
        library: testData.library.name,
      });

      // Step 2: Fill in "FOLIO name*"
      CreateLocations.fillFolioName(locationData.folioName);

      // Step 3: Select remote storage RS1
      CreateLocations.selectRemoteStorage(testData.remoteStorage1.name);

      // Step 4: Fill in "Code*"
      CreateLocations.fillCode(locationData.code);

      // Step 5: Fill in "Discovery display name*"
      CreateLocations.fillDiscoveryDisplayName(locationData.discoveryDisplayName);

      // Step 6: Select service point
      CreateLocations.selectServicePoint(testData.servicePoint.name);

      // Step 7: Click "+New" under "Location details" accordion
      CreateLocations.clickAddLocationDetail();

      // Step 8: Fill in "Name"
      CreateLocations.fillLocationDetailName(locationData.detailName);

      // Step 9: Fill in "Value"
      CreateLocations.fillLocationDetailValue(locationData.detailValue);

      // Step 10: Click "Save & close"
      CreateLocations.saveAndClose();

      // Step 11: Verify location detail view fields
      LocationDetails.checkLocationDetails({
        institution: testData.institution.name,
        campus: testData.campus.name,
        library: testData.library.name,
        folioName: locationData.folioName,
        code: locationData.code,
        discoveryDisplayName: locationData.discoveryDisplayName,
        servicePoint: testData.servicePoint.name,
        status: 'Active',
        detailName: locationData.detailName,
        detailValue: locationData.detailValue,
      });
      LocationDetails.checkMetadata();
      Locations.verifyRemoteStorageValue(testData.remoteStorage1.name);

      // Step 12: Click "Actions" > "Edit"
      LocationDetails.openEditLocationForm();

      // Step 13: Verify "Name" and "Value" fields in "Location details"
      CreateLocations.verifyLocationDetailFields(locationData.detailName, locationData.detailValue);

      // Step 14: Select RS2 from "Remote storage*" and save
      CreateLocations.selectRemoteStorage(testData.remoteStorage2.name);
      CreateLocations.saveAndClose();

      // Step 15: Verify remote storage updated to RS2
      Locations.verifyRemoteStorageValue(testData.remoteStorage2.name);

      // Step 16: Duplicate and verify remote storage shows RS2 in form
      Locations.duplicate();
      CreateLocations.verifyFormRemoteStorageValue(testData.remoteStorage2.name);

      // Step 17: Change remote storage to RS1, edit FOLIO name and code, save
      CreateLocations.selectRemoteStorage(testData.remoteStorage1.name);
      CreateLocations.fillFolioName(locationData.duplicatedFolioName);
      CreateLocations.fillCode(locationData.duplicatedCode);
      CreateLocations.saveAndClose();

      // Step 18: Verify duplicated location detail view fields
      LocationDetails.checkLocationDetails({
        folioName: locationData.duplicatedFolioName,
        code: locationData.duplicatedCode,
        institution: testData.institution.name,
        campus: testData.campus.name,
        library: testData.library.name,
        discoveryDisplayName: locationData.discoveryDisplayName,
        servicePoint: testData.servicePoint.name,
        status: 'Active',
        detailName: locationData.detailName,
        detailValue: locationData.detailValue,
      });
      Locations.verifyRemoteStorageValue(testData.remoteStorage1.name);
    },
  );
});
