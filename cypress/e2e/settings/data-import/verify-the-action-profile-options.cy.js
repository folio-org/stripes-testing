import { Permissions } from '../../../support/dictionary';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';

describe('data-import', () => {
  describe('Settings', () => {
    let user;

    const mappingProfileName = `mapping_${getRandomPostfix()}`;
    const actionProfileName = `action_${getRandomPostfix()}`;

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
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileName);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C421995 - (NON-CONSORTIA) Verify the action profile options (Folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const actionCreate = 'Create (all record types except MARC Authority or MARC Holdings)';
        const actionModify = 'Modify (MARC Bibliographic record type only)';
        const recordTypeBibliographic = 'MARC Bibliographic';

        ActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyNewActionProfileExists();

        [
          'Instance',
          'Holdings',
          'Item',
          'Order',
          'Invoice',
          'MARC Bibliographic',
          'MARC Authority',
        ].forEach((type) => {
          NewActionProfile.verifyFOLIORecordTypeOptionExists(type);
        });

        NewActionProfile.clickClose();
        ActionProfiles.search(actionProfileName);
        ActionProfiles.verifyActionProfileOpened(actionProfileName);
        ActionProfileView.edit();

        ActionProfileEdit.changeAction(actionCreate);

        ['Instance', 'Holdings', 'Item', 'Order', 'Invoice', 'MARC Bibliographic'].forEach(
          (type) => {
            ActionProfileEdit.verifyFOLIORecordTypeOptionExists(type);
          },
        );

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
