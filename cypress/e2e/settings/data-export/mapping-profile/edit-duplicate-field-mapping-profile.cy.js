import permissions from '../../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ModalSelectTransformations from '../../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import SingleFieldMappingProfilePane from '../../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

let user;
const profileNames = [
  getTestEntityValue('first-fieldMappingProfile'),
  getTestEntityValue('second-fieldMappingProfile'),
];

const updatedFieldMappingProfileName = getTestEntityValue('updated-fieldMappingProfile');
const updatedDescription = getTestEntityValue('description');
const updatedTransformationCalloutMessage = 'The transformations have been updated';
const updatedFieldMappingProfileCalloutMessage = `The field mapping profile ${updatedFieldMappingProfileName} has been successfully saved`;

const duplicatedFieldMappingProfileName = `Copy of ${profileNames[1]}`;
const duplicatedFieldMappingProfileCalloutMessage = `The field mapping profile ${duplicatedFieldMappingProfileName} has been successfully created`;

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;
          profileNames.forEach((name) => {
            ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(name);
          });
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    beforeEach('go to page', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      ExportFieldMappingProfiles.openTabFromDataExportSettingsList();
    });

    after('delete test data', () => {
      cy.getAdminToken();
      [updatedFieldMappingProfileName, profileNames[1], duplicatedFieldMappingProfileName].forEach(
        (name) => {
          ExportFieldMappingProfiles.getFieldMappingProfile({ query: `"name"=="${name}"` }).then(
            (response) => {
              DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
            },
          );
        },
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C895646 Editing the existing mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C895646'] },
      () => {
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(profileNames[0]);
        SingleFieldMappingProfilePane.verifyActionOptions();
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          updatedFieldMappingProfileName,
          updatedDescription,
        );
        SingleFieldMappingProfilePane.checkRecordType('Item');
        SingleFieldMappingProfilePane.clickEditTransformations();
        ModalSelectTransformations.searchItemTransformationsByName('Item - ID');
        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.fillInTransformationsTextfields('458', '1', '2', 'a');

        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(updatedTransformationCalloutMessage);

        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(updatedFieldMappingProfileCalloutMessage);
        ExportFieldMappingProfiles.searchFieldMappingProfile(updatedFieldMappingProfileName);
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(updatedFieldMappingProfileName);
      },
    );

    it(
      'C895647 Duplicate the existing mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C895647'] },
      () => {
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(profileNames[1]);
        SingleFieldMappingProfilePane.verifyActionOptions();
        SingleFieldMappingProfilePane.duplicateFieldMappingProfile();

        InteractorsTools.checkCalloutMessage(duplicatedFieldMappingProfileCalloutMessage);
        ExportFieldMappingProfiles.searchFieldMappingProfile(duplicatedFieldMappingProfileName);
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(duplicatedFieldMappingProfileName);
      },
    );
  });
});
