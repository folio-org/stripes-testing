import { Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfileEdit from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileEdit';

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
      'MARC Holdings',
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
        cy.visit(SettingsMenu.matchProfilePath);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ActionProfiles.deleteActionProfile(actionProfileName);
      FieldMappingProfileView.deleteViaApi(mappingProfileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C421998 - (NON-CONSORTIA) Verify the field mapping profile options (Folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.waitLoading();

        FOLIORecordTypes.forEach((type) => {
          NewFieldMappingProfile.verifyFOLIORecordTypeOptionExists(type);
        });

        NewFieldMappingProfile.clickClose();
        FieldMappingProfiles.search(mappingProfileName);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfileName);

        FOLIORecordTypes.forEach((type) => {
          FieldMappingProfileEdit.verifyFOLIORecordTypeOptionExists(type);
        });
      },
    );
  });
});
