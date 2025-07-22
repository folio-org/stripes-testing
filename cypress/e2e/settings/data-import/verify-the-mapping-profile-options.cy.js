import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileEdit from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileEdit';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    const mappingProfile = {
      name: `C421998 mapping profile_${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C421998 action_${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
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

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfileResponse.body.id);
        },
      );
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C421998 (NON-CONSORTIA) Verify the field mapping profile options (Folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C421998'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.waitLoading();

        FOLIORecordTypes.forEach((type) => {
          NewFieldMappingProfile.verifyFOLIORecordTypeOptionExists(type);
        });

        NewFieldMappingProfile.clickClose();
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfileView.edit();
        FieldMappingProfileEdit.verifyScreenName(mappingProfile.name);

        FOLIORecordTypes.forEach((type) => {
          FieldMappingProfileEdit.verifyFOLIORecordTypeOptionExists(type);
        });
      },
    );
  });
});
