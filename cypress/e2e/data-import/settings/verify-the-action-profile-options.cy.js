import { Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    const mappingProfileName = `mapping_${getRandomPostfix()}`;
    const actionProfileName = `action_${getRandomPostfix()}`;
    const FOLIORecordTypes = [
      'Instance',
      'Holdings',
      'Item',
      'Order',
      'Invoice',
      'MARC Bibliographic',
      'MARC Authority',
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createMappingProfileViaApi(mappingProfileName).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfileName,
            mappingProfileResponse.body.id,
          );
        },
      );
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
        cy.visit(SettingsMenu.actionProfilePath);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ActionProfiles.deleteActionProfile(actionProfileName);
      FieldMappingProfileView.deleteViaApi(mappingProfileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C421995 - (NON-CONSORTIA) Verify the action profile options (Folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        ActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyNewActionProfileExists();

        FOLIORecordTypes.forEach((type) => {
          NewActionProfile.verifyFOLIORecordTypeOptionExists(type);
        });

        NewActionProfile.clickClose();
        ActionProfiles.search(actionProfileName);
        ActionProfiles.verifyActionProfileOpened(actionProfileName);
        ActionProfileView.edit();

        FOLIORecordTypes.forEach((type) => {
          ActionProfileEdit.verifyFOLIORecordTypeOptionExists(type);
        });
      },
    );
  });
});
