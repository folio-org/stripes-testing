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
  getTestEntityValue('C15827_second-fieldMappingProfile'),
  getTestEntityValue('C15827_mappingProfileReferencedInJobProfile'),
];
const mappingProfileIds = [];
const jobProfileName = `AT_C15827_JobProfile_${getRandomPostfix()}`;
const addedTransformationCalloutMessage = '1 transformation has been successfully added';
const duplicatedFieldMappingProfileName = getTestEntityValue(
  'C15827_duplicated-fieldMappingProfile',
);
const duplicatedDescription = getTestEntityValue('C15827_duplicated-description');
const duplicatedFieldMappingProfileCalloutMessage = `The field mapping profile ${duplicatedFieldMappingProfileName} has been successfully created`;

const duplicatedFieldMappingProfileNameFromReferencedProfile = `Copy of ${profileNames[1]}`;
const duplicatedFieldMappingProfileCalloutMessageFromReferencedProfile = `The field mapping profile ${duplicatedFieldMappingProfileNameFromReferencedProfile} has been successfully created`;

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

      [
        profileNames[0],
        duplicatedFieldMappingProfileName,
        duplicatedFieldMappingProfileNameFromReferencedProfile,
      ].forEach((name) => {
        ExportFieldMappingProfiles.getFieldMappingProfile({ query: `"name"=="${name}"` }).then(
          (response) => {
            DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
          },
        );
      });

      Users.deleteViaApi(user.userId);
    });

    it(
      'C15827 User with "Settings - UI-Data-Export Settings - Edit" capability set is able to duplicate unlocked mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C15827'] },
      () => {
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(profileNames[0]);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifyActionOptions();

        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.verifyNameTextField(`Copy of ${profileNames[0]}`);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);

        SingleFieldMappingProfilePane.editFieldMappingProfile(
          duplicatedFieldMappingProfileName,
          duplicatedDescription,
        );
        SingleFieldMappingProfilePane.verifyMetadataSectionExists();
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);

        SingleFieldMappingProfilePane.checkRecordType('Item');
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.searchItemTransformationsByName('Item - ID');
        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.fillInTransformationsTextfields('459', '1', '2', 'b');

        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(addedTransformationCalloutMessage);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          'Item - ID',
          '459',
          '1',
          '2',
          'b',
        );

        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(duplicatedFieldMappingProfileCalloutMessage);
        ExportFieldMappingProfiles.searchFieldMappingProfile(duplicatedFieldMappingProfileName);
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(duplicatedFieldMappingProfileName);

        const duplicatedDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          duplicatedFieldMappingProfileName,
          'Srs,Item',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.username}`,
        );

        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          duplicatedFieldMappingProfileName,
        );

        const duplicatedProfileDetails = {
          source: user.username,
          name: duplicatedFieldMappingProfileName,
          recordType: 'Source record storage (entire record)Item',
          outputFormat: 'MARC',
          description: duplicatedDescription,
          transformation: '',
        };

        SingleFieldMappingProfilePane.verifyProfileDetails(duplicatedProfileDetails);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(
          'Item - ID',
          '459',
          '1',
          '2',
          'b',
        );

        SingleFieldMappingProfilePane.clickCloseButton();
        ExportFieldMappingProfiles.clearSearchField();
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(profileNames[1]);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifyActionOptions();

        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifyNameTextField(`Copy of ${profileNames[1]}`);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);

        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          duplicatedFieldMappingProfileCalloutMessageFromReferencedProfile,
        );
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          duplicatedFieldMappingProfileNameFromReferencedProfile,
        );
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(
          duplicatedFieldMappingProfileNameFromReferencedProfile,
        );

        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          duplicatedFieldMappingProfileNameFromReferencedProfile,
          'Srs',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.username}`,
        );

        ExportFieldMappingProfiles.clickProfileNameFromTheList(
          duplicatedFieldMappingProfileNameFromReferencedProfile,
        );

        const duplicatedProfileFromReferencedDetails = {
          source: user.username,
          name: duplicatedFieldMappingProfileNameFromReferencedProfile,
          recordType: 'Source record storage (entire record)',
          outputFormat: 'MARC',
          description: 'No value set-',
        };

        SingleFieldMappingProfilePane.verifyProfileDetails(duplicatedProfileFromReferencedDetails);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
      },
    );
  });
});
