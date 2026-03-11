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
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';

let user;
let createdJobProfileId;
const profileNames = [
  getTestEntityValue('C15826_first-fieldMappingProfile'),
  getTestEntityValue('C15826_mappingProfileReferencedInJobProfile'),
];
const mappingProfileIds = [];
const jobProfileName = `AT_C15826_JobProfile_${getRandomPostfix()}`;
const updatedFieldMappingProfileName = getTestEntityValue('C15826_updated-fieldMappingProfile');
const updatedSecondFieldMappingProfileName = getTestEntityValue(
  'C15826_updated-fieldMappingProfile',
);
const updatedDescription = getTestEntityValue('description');
const updatedTransformationCalloutMessage = 'The transformations have been updated';
const updatedFieldMappingProfileCalloutMessage = (mappingProfileName) => {
  return `The field mapping profile ${mappingProfileName} has been successfully saved`;
};

describe('Data Export', () => {
  describe('Mapping profile', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.then(() => {
            profileNames.forEach((name) => {
              ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(name).then(
                (response) => {
                  mappingProfileIds.push(response.body.id);
                },
              );
            });
          }).then(() => {
            ExportNewJobProfile.createNewJobProfileViaApi(
              jobProfileName,
              mappingProfileIds[1],
            ).then((respose) => {
              createdJobProfileId = respose.body.id;
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
          ExportFieldMappingProfiles.openTabFromDataExportSettingsList();
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      ExportJobProfiles.deleteJobProfileViaApi(createdJobProfileId);

      [updatedFieldMappingProfileName, updatedSecondFieldMappingProfileName].forEach((name) => {
        ExportFieldMappingProfiles.getFieldMappingProfile({ query: `"name"=="${name}"` }).then(
          (response) => {
            DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
          },
        );
      });

      Users.deleteViaApi(user.userId);
    });

    it(
      'C15826 User with "Settings - UI-Data-Export Settings - Edit" capability set is able to edit unlocked mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C15826'] },
      () => {
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(profileNames[0]);
        SingleFieldMappingProfilePane.verifyActionOptions();
        SingleFieldMappingProfilePane.clickEditButton();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled();
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          updatedFieldMappingProfileName,
          updatedDescription,
        );
        SingleFieldMappingProfilePane.verifyMetadataSectionExists();
        SingleFieldMappingProfilePane.checkRecordType('Item');
        SingleFieldMappingProfilePane.clickEditTransformations();
        ModalSelectTransformations.searchItemTransformationsByName('Item - ID');
        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.fillInTransformationsTextfields('458', '1', '2', 'a');

        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(updatedTransformationCalloutMessage);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          'Item - ID',
          '458',
          '1',
          '2',
          'a',
        );

        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          updatedFieldMappingProfileCalloutMessage(updatedFieldMappingProfileName),
        );
        ExportFieldMappingProfiles.searchFieldMappingProfile(updatedFieldMappingProfileName);
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(updatedFieldMappingProfileName);

        const updatedDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          updatedFieldMappingProfileName,
          'Srs,Item',
          'MARC',
          updatedDate,
          `${user.personal.firstName} ${user.username}`,
        );

        SingleFieldMappingProfilePane.clickProfileNameFromTheList(updatedFieldMappingProfileName);

        const profileDetails = {
          source: user.username,
          name: updatedFieldMappingProfileName,
          recordType: 'Source record storage (entire record)Item',
          outputFormat: 'MARC',
          description: updatedDescription,
          transformation: '',
        };

        SingleFieldMappingProfilePane.verifyProfileDetails(profileDetails);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          'Item - ID',
          '458',
          '1',
          '2',
          'a',
        );

        SingleFieldMappingProfilePane.clickCloseButton();
        ExportFieldMappingProfiles.clearSearchField();
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(profileNames[1]);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        SingleFieldMappingProfilePane.verifyActionOptions();

        SingleFieldMappingProfilePane.clickEditButton();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled();
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);

        SingleFieldMappingProfilePane.editFieldMappingProfile(
          updatedSecondFieldMappingProfileName,
          updatedDescription,
        );
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          updatedFieldMappingProfileCalloutMessage(updatedSecondFieldMappingProfileName),
        );
        ExportFieldMappingProfiles.searchFieldMappingProfile(updatedSecondFieldMappingProfileName);
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(updatedSecondFieldMappingProfileName);

        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          updatedSecondFieldMappingProfileName,
          'Srs',
          'MARC',
          updatedDate,
          `${user.personal.firstName} ${user.username}`,
        );

        ExportFieldMappingProfiles.clickProfileNameFromTheList(
          updatedSecondFieldMappingProfileName,
        );

        const profileReferencedInJobProfileDetails = {
          source: user.username,
          name: updatedSecondFieldMappingProfileName,
          recordType: 'Source record storage (entire record)',
          outputFormat: 'MARC',
          description: updatedDescription,
        };

        SingleFieldMappingProfilePane.verifyProfileDetails(profileReferencedInJobProfileDetails);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
      },
    );
  });
});
