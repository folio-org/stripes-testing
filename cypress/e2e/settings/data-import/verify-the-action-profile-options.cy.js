import { ACTION_NAMES_IN_ACTION_PROFILE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    const mappingProfile = {
      name: `C421995 mapping profile${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C421995 action profile${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };

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
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
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
      'C421995 (NON-CONSORTIA) Verify the action profile options (Folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C421995'] },
      () => {
        const actionCreate = ACTION_NAMES_IN_ACTION_PROFILE.CREATE;
        const actionModify = ACTION_NAMES_IN_ACTION_PROFILE.MODIFY;
        const recordTypeBibliographic = 'MARC Bibliographic';

        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyNewActionProfileExists();

        ['Instance', 'Holdings', 'Item', 'Order', 'Invoice', 'MARC Authority'].forEach((type) => {
          NewActionProfile.verifyFOLIORecordTypeOptionExists(type);
        });

        NewActionProfile.clickClose();
        ActionProfiles.search(actionProfile.name);
        ActionProfiles.verifyActionProfileOpened(actionProfile.name);
        ActionProfileView.edit();

        ActionProfileEdit.changeAction(actionCreate);

        ['Instance', 'Holdings', 'Item', 'Order', 'Invoice'].forEach((type) => {
          ActionProfileEdit.verifyFOLIORecordTypeOptionExists(type);
        });

        ActionProfileEdit.changeAction();

        ['Instance', 'Holdings', 'Item', 'MARC Bibliographic', 'MARC Authority'].forEach((type) => {
          ActionProfileEdit.verifyFOLIORecordTypeOptionExists(type);
        });

        ActionProfileEdit.changeRecordType(recordTypeBibliographic);
        ActionProfileEdit.changeAction(actionModify);
        ActionProfileEdit.verifyFOLIORecordTypeOptionExists(recordTypeBibliographic);
      },
    );
  });
});
