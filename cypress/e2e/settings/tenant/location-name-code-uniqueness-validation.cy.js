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
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Settings: Tenant', () => {
  const postfix = getRandomPostfix();
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    existingLowerLocationId: uuid(),
    existingSpecialLocationId: uuid(),
  };

  // Original lowercase precondition location (analogue of "test"/"test")
  const existingLower = {
    name: `at_c965837_test_${postfix}`,
    code: `at_c965837_test_${postfix}`,
  };
  // Uppercase variant of the lowercase precondition (analogue of "TEST"/"TEST")
  const existingUpper = {
    name: existingLower.name.toUpperCase(),
    code: existingLower.code.toUpperCase(),
  };
  // Precondition location with special characters (analogue of "KU\CC\DI\C")
  const existingSpecial = {
    name: `KU\\CC\\DI\\C_${postfix}`,
    code: `KU\\CC\\DI\\C_${postfix}`,
  };
  // Unique location created via UI in step 6
  const newUnique = {
    name: `at_c965837_unique_${postfix}`,
    code: `at_c965837_unique_${postfix}`,
  };
  // Unique location created via duplicate in step 16
  const duplicatedUnique = {
    name: `at_c965837_unique_dup_${postfix}`,
    code: `at_c965837_unique_dup_${postfix}`,
  };
  // Unique location with different special characters created in step 19
  const newSpecial = {
    name: `K*C_${postfix}`,
    code: `K*C_${postfix}`,
  };

  const errorNameUnique = 'Location name must be unique';
  const errorCodeUnique = 'Location code must be unique';

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
          Libraries.createViaApi(testData.library).then(() => {
            Locations.createViaApi({
              id: testData.existingLowerLocationId,
              name: existingLower.name,
              code: existingLower.code,
              isActive: true,
              institutionId: testData.institution.id,
              campusId: testData.campus.id,
              libraryId: testData.library.id,
              discoveryDisplayName: existingLower.name,
              servicePointIds: [testData.servicePoint.id],
              primaryServicePoint: testData.servicePoint.id,
            });
            Locations.createViaApi({
              id: testData.existingSpecialLocationId,
              name: existingSpecial.name,
              code: existingSpecial.code,
              isActive: true,
              institutionId: testData.institution.id,
              campusId: testData.campus.id,
              libraryId: testData.library.id,
              discoveryDisplayName: `at_c965837_special_${postfix}`,
              servicePointIds: [testData.servicePoint.id],
              primaryServicePoint: testData.servicePoint.id,
            });
          });
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
    // Preconditions: delete by known IDs (avoids CQL escaping for special chars)
    [testData.existingLowerLocationId, testData.existingSpecialLocationId].forEach((id) => {
      Locations.deleteLocationViaApi(id);
    });
    // UI-created locations: lookup by name then delete by id
    [newUnique.name, duplicatedUnique.name].forEach((name) => {
      cy.getLocations({ query: `name=="${name}"` }).then((res) => {
        if (res) Locations.deleteLocationViaApi(res.id);
      });
    });
    // newSpecial.name contains "*" (CQL wildcard); look it up via the unique postfix
    cy.getLocations({ query: `code=="*${postfix}"` }).then((res) => {
      if (res) Locations.deleteLocationViaApi(res.id);
    });
    Libraries.deleteViaApi(testData.library.id);
    Campuses.deleteViaApi(testData.campus.id);
    Institutions.deleteViaApi(testData.institution.id);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C965837 Verify case sensitivity and uniqueness validation for location name and code (firebird)',
    { tags: ['extendedPath', 'firebird', 'C965837'] },
    () => {
      // Step 1: Navigate to Settings > Tenant > Locations
      cy.log('=== Step 1: Navigate to Settings > Tenant > Locations ===');
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      Locations.openLTabFromSettingsList();
      Locations.selectOption('Institution', testData.institution);
      Locations.selectOption('Campus', testData.campus);
      Locations.selectOption('Library', testData.library);

      // Step 2: Click "New" to open new location form
      cy.log('=== Step 2: Click "New" to open new location form ===');
      Locations.createNewLocation();
      CreateLocations.verifyNewFormIsOpen({
        institution: testData.institution.name,
        campus: testData.campus.name,
        library: testData.library.name,
      });

      // Step 3: Fill in same name/code as existing lowercase location -> uniqueness error on blur
      cy.log(
        `=== Step 3: Fill name/code with existing lowercase ("${existingLower.name}") -> expect error ===`,
      );
      CreateLocations.fillFolioName(existingLower.name);
      CreateLocations.fillCode(existingLower.code);
      CreateLocations.fillDiscoveryDisplayName(`discovery_${postfix}`);
      CreateLocations.selectServicePoint(testData.servicePoint.name);
      CreateLocations.verifyFolioNameFieldError(errorNameUnique);
      CreateLocations.verifyCodeFieldError(errorCodeUnique);

      // Step 4: Change to uppercase variant of existing -> uniqueness error (case-insensitive)
      cy.log(
        `=== Step 4: Change to uppercase ("${existingUpper.name}") -> expect error (case-insensitive) ===`,
      );
      CreateLocations.fillFolioName(existingUpper.name);
      CreateLocations.verifyFolioNameFieldError(errorNameUnique);
      CreateLocations.fillCode(existingUpper.code);
      CreateLocations.verifyCodeFieldError(errorCodeUnique);

      // Step 5: Change to unique values -> no error (blur to fire field-level validation)
      cy.log(`=== Step 5: Change to unique ("${newUnique.name}") -> expect no error ===`);
      CreateLocations.fillFolioName(newUnique.name);
      CreateLocations.fillCode(newUnique.code);
      CreateLocations.verifyFolioNameFieldNoError();
      CreateLocations.verifyCodeFieldNoError();

      // Step 6: Save & close -> location is created
      cy.log('=== Step 6: Save & close -> expect location created ===');
      CreateLocations.saveAndCloseSuccessfully();
      LocationDetails.checkLocationDetails({
        folioName: newUnique.name,
        code: newUnique.code,
      });

      // Step 7: Open existing lowercase precondition location and click Edit
      cy.log(`=== Step 7: Open lowercase location ("${existingLower.name}") and click Edit ===`);
      Locations.openLocationDetails({ column: 'Name', content: existingLower.name });
      LocationDetails.checkLocationDetails({
        folioName: existingLower.name,
        code: existingLower.code,
      });
      LocationDetails.openEditLocationForm();
      CreateLocations.verifyFormIsOpen();
      // Wait until the form's pre-filled values are present AND stable, so a late
      // RFF reinitialize cannot overwrite the values we are about to type.
      CreateLocations.waitFormReadyToEdit({
        name: existingLower.name,
        code: existingLower.code,
      });

      // Step 8: Change name/code in edit form to match another existing location -> uniqueness error on blur
      cy.log(
        `=== Step 8: Edit -> change name/code to existing other ("${newUnique.name}") -> expect error ===`,
      );
      CreateLocations.fillFolioName(newUnique.name);
      CreateLocations.verifyFolioNameFieldError(errorNameUnique);
      CreateLocations.fillCode(newUnique.code);
      CreateLocations.verifyCodeFieldError(errorCodeUnique);

      // Step 9: Change to uppercase of CURRENT location -> no error (case change of own record, UITEN-337)
      cy.log(
        `=== Step 9: Edit -> change to uppercase of CURRENT ("${existingUpper.name}") -> expect no error ===`,
      );
      CreateLocations.fillFolioName(existingUpper.name);
      CreateLocations.fillCode(existingUpper.code);
      CreateLocations.verifyFolioNameFieldNoError();
      CreateLocations.verifyCodeFieldNoError();

      // Step 10: Save & close -> location is saved with case-changed name/code
      cy.log('=== Step 10: Save & close -> expect location saved with uppercase name/code ===');
      CreateLocations.saveAndCloseSuccessfully();
      Locations.openLocationDetails({ column: 'Name', content: existingUpper.name });
      LocationDetails.checkLocationDetails({
        folioName: existingUpper.name,
        code: existingUpper.code,
      });

      // Step 11: Select the now-renamed (uppercase) location and click Actions > Duplicate
      cy.log('=== Step 11: Select uppercase location and Duplicate ===');
      Locations.duplicate();
      CreateLocations.verifyFormIsOpen();
      CreateLocations.waitFormReadyToEdit({
        name: existingUpper.name,
        code: existingUpper.code,
      });

      // Step 12: Keep same name/code, change another field -> Save button enabled
      cy.log(
        '=== Step 12: Duplicate form -> keep name/code, change another field -> Save enabled ===',
      );
      CreateLocations.fillDiscoveryDisplayName(`discovery_dup_${postfix}`);
      CreateLocations.verifySaveButtonEnabled();

      // Step 13: Save with same name/code as source -> uniqueness error
      cy.log('=== Step 13: Save duplicate as-is -> expect error ===');
      CreateLocations.saveAndClose();
      CreateLocations.verifyFormIsOpen();
      CreateLocations.verifyFolioNameFieldError(errorNameUnique);
      CreateLocations.verifyCodeFieldError(errorCodeUnique);

      // Step 14: Change to lowercase variant of selected -> still uniqueness error (case-insensitive)
      cy.log(
        `=== Step 14: Change duplicate to lowercase ("${existingLower.name}") -> expect error ===`,
      );
      CreateLocations.fillFolioName(existingLower.name);
      CreateLocations.verifyFolioNameFieldError(errorNameUnique);
      CreateLocations.fillCode(existingLower.code);
      CreateLocations.verifyCodeFieldError(errorCodeUnique);

      // Step 15: Change to unique values -> no error
      cy.log(
        `=== Step 15: Change duplicate to unique ("${duplicatedUnique.name}") -> expect no error ===`,
      );
      CreateLocations.fillFolioName(duplicatedUnique.name);
      CreateLocations.fillCode(duplicatedUnique.code);
      CreateLocations.verifyFolioNameFieldNoError();
      CreateLocations.verifyCodeFieldNoError();

      // Step 16: Save & close -> duplicate location is created
      cy.log('=== Step 16: Save & close duplicate -> expect new location created ===');
      CreateLocations.saveAndCloseSuccessfully();
      Locations.openLocationDetails({ column: 'Name', content: duplicatedUnique.name });
      LocationDetails.checkLocationDetails({
        folioName: duplicatedUnique.name,
        code: duplicatedUnique.code,
      });

      // Step 17: Click "New" again, fill same name/code as existing special-character location -> error (UITEN-338)
      cy.log(
        `=== Step 17: New -> fill name/code with special-char existing ("${existingSpecial.name}") -> expect error ===`,
      );
      Locations.createNewLocation();
      CreateLocations.verifyNewFormIsOpen({
        institution: testData.institution.name,
        campus: testData.campus.name,
        library: testData.library.name,
      });
      CreateLocations.fillFolioName(existingSpecial.name);
      CreateLocations.verifyFolioNameFieldError(errorNameUnique);
      CreateLocations.fillCode(existingSpecial.code);
      CreateLocations.verifyCodeFieldError(errorCodeUnique);
      CreateLocations.fillDiscoveryDisplayName(`discovery_special_${postfix}`);
      CreateLocations.selectServicePoint(testData.servicePoint.name);

      // Step 18: Change to unique values containing other special characters -> no error
      cy.log(
        `=== Step 18: Change to unique special-char value ("${newSpecial.name}") -> expect no error ===`,
      );
      CreateLocations.fillFolioName(newSpecial.name);
      CreateLocations.fillCode(newSpecial.code);
      CreateLocations.verifyFolioNameFieldNoError();
      CreateLocations.verifyCodeFieldNoError();

      // Step 19: Save & close -> new location with special characters is created
      cy.log('=== Step 19: Save & close special-char location -> expect new location created ===');
      CreateLocations.saveAndCloseSuccessfully();
      Locations.openLocationDetails({ column: 'Name', content: newSpecial.name });
      LocationDetails.checkLocationDetails({
        folioName: newSpecial.name,
        code: newSpecial.code,
      });
    },
  );
});
