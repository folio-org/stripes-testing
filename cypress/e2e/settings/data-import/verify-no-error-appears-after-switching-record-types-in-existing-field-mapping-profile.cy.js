import { HTML, including } from '@interactors/html';
import { FOLIO_RECORD_TYPE, EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    const testData = {
      mappingProfile: FieldMappingProfiles.getDefaultMappingProfile({
        existingRecordType: EXISTING_RECORD_NAMES.ITEM,
      }),
    };
    const checkUiDidNotCrash = () => {
      cy.wait(2000); // Crash may happen with a delay
      cy.expect(HTML(including('Something went wrong')).absent());
    };
    let user;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        FieldMappingProfiles.createMappingProfileViaApi(testData.mappingProfile);
      });

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FieldMappingProfiles.deleteMappingProfileViaApi(testData.mappingProfile.profile.id);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C366111 Verify no error appears after switching record types when editing existing field mapping profile (promin)',
      { tags: ['extendedPath', 'promin', 'C366111'] },
      () => {
        // Step 1: Open field mapping profile view; click Edit
        const FieldMappingProfileView = FieldMappingProfiles.openFieldMappingProfileView({
          name: testData.mappingProfile.profile.name,
          type: EXISTING_RECORD_NAMES.ITEM,
        });
        const FieldMappingProfileEditForm = FieldMappingProfileView.clickEditButton();

        // Steps 2-4: Switch FOLIO record type through multiple values; verify no "Something went wrong" after each
        [
          FOLIO_RECORD_TYPE.HOLDINGS,
          FOLIO_RECORD_TYPE.INSTANCE,
          FOLIO_RECORD_TYPE.ORDER,
          FOLIO_RECORD_TYPE.INVOICE,
        ].forEach((recordType) => {
          FieldMappingProfileEditForm.fillSummaryProfileFields({
            name: testData.mappingProfile.profile.name,
            existingRecordType: recordType,
          });
          checkUiDidNotCrash();
        });

        // Step 5: Close without saving → profile reverts to original
        FieldMappingProfileEditForm.clickCloseButton();
        FieldMappingProfileView.verifyFormView({
          type: EXISTING_RECORD_NAMES.ITEM,
        });
      },
    );
  });
});
