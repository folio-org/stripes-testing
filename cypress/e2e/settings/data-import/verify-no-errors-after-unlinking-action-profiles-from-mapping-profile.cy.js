import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfileEditForm from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileEditForm';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      fieldMappingProfile: {
        name: `AT_C377029_FieldMappingProfile_${randomPostfix}`,
      },
      actionProfile1: {
        name: `AT_C377029_ActionProfile1_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      },
      actionProfile2: {
        name: `AT_C377029_ActionProfile2_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      },
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(testData.fieldMappingProfile).then(
        (mappingResponse) => {
          testData.fieldMappingProfile.id = mappingResponse.body.id;
          NewActionProfile.createActionProfileViaApi(
            testData.actionProfile1,
            mappingResponse.body.id,
          ).then((actionResponse1) => {
            testData.actionProfile1.id = actionResponse1.body.id;
          });
          NewActionProfile.createActionProfileViaApi(
            testData.actionProfile2,
            mappingResponse.body.id,
          ).then((actionResponse2) => {
            testData.actionProfile2.id = actionResponse2.body.id;
          });
        },
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      ActionProfiles.deleteActionProfileByNameViaApi(testData.actionProfile1.name);
      ActionProfiles.deleteActionProfileByNameViaApi(testData.actionProfile2.name);
      cy.wait(500);
      FieldMappingProfiles.deleteMappingProfileByNameViaApi(testData.fieldMappingProfile.name);
    });

    it(
      'C377029 Verify no errors appear on fields mapping profile after unlinking associated action profiles (promin)',
      { tags: ['extendedPath', 'promin', 'C377029'] },
      () => {
        // Step 9: Open field mapping profile; verify both action profiles linked
        FieldMappingProfiles.search(testData.fieldMappingProfile.name);
        FieldMappingProfiles.selectMappingProfileFromList(testData.fieldMappingProfile.name);
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyMappingProfileTitleName(testData.fieldMappingProfile.name);
        FieldMappingProfileView.verifyLinkedActionProfile(testData.actionProfile1.name);
        FieldMappingProfileView.verifyLinkedActionProfile(testData.actionProfile2.name);
        cy.wait(2000);

        // Step 10: Click Edit
        FieldMappingProfileView.clickEditButton();

        // Step 11: Unlink action profile 1; confirm; verify absent + save button active
        FieldMappingProfileEditForm.unlinkActionProfile(testData.actionProfile1.name);
        FieldMappingProfileEditForm.checkButtonsConditions([
          { label: 'Save as profile & Close', conditions: { disabled: false } },
        ]);

        // Step 12: Save; verify no errors + update callout + action profile 2 still linked
        FieldMappingProfileEditForm.clickSaveAndCloseButton({
          profileCreated: false,
          profileUpdated: true,
        });
        FieldMappingProfileView.verifyActionProfileAbsent(testData.actionProfile1.name);
        FieldMappingProfileView.verifyLinkedActionProfile(testData.actionProfile2.name);
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
