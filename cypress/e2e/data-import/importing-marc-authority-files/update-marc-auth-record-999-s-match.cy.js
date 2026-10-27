import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import {
  EXISTING_RECORD_NAMES,
  APPLICATION_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const authorityHeading = `AT_C350668_MarcAuthority_${randomPostfix}`;
    const naturalId = `n350668${randomNDigitNumber(10)}`;
    const testData = {
      searchOption: 'Keyword',
      updatedHeading: `${authorityHeading} Updated by 999ffSs match`,
      updated100FieldContent: `$a ${authorityHeading} $t Updated by 999ffSs match`,
      added400FieldContent: `$a ${authorityHeading} added field`,
      csvFile: `AT_C350668_authorityUUIDs_${randomPostfix}.csv`,
      exportedMarcFile: `AT_C350668_exportedMarcFile_${randomPostfix}.mrc`,
      editedMarcFile: `AT_C350668_editedMarcFile_${randomPostfix}.mrc`,
    };
    const marcAuthFields = [
      { tag: '100', content: `$a ${authorityHeading}`, indicators: ['1', '\\'] },
    ];
    const mappingProfile = {
      name: `C350668 Update MARC authority records ${randomPostfix}`,
    };
    const actionProfile = {
      name: `C350668 Update MARC authority records ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `C350668 Update MARC authority records by matching 999 ff $s subfield value ${randomPostfix}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      profileName: `C350668 Update MARC authority records by matching 999 ff $s subfield value ${randomPostfix}`,
    };
    let createdAuthorityID;

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350668_');

      cy.then(() => {
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile).then(
          (mappingProfileResponse) => {
            mappingProfile.id = mappingProfileResponse.body.id;
          },
        );
      })
        .then(() => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
            (actionProfileResponse) => {
              actionProfile.id = actionProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile).then(
            (matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfile.profileName,
            matchProfile.id,
            actionProfile.id,
          );
        })
        .then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI(naturalId, '', marcAuthFields).then((id) => {
            createdAuthorityID = id;
          });
        })
        .then(() => {
          // Export the created record to get a file with its 999 ff $s
          FileManager.createFile(`cypress/fixtures/${testData.csvFile}`, createdAuthorityID);
          ExportFile.exportFileViaApi(
            testData.csvFile,
            'authority',
            'Default authority export job profile',
          ).then(() => {
            ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);
          });
        })
        .then(() => {
          cy.readFile(`cypress/downloads/${testData.exportedMarcFile}`, 'binary').then(
            (content) => {
              cy.writeFile(`cypress/fixtures/${testData.exportedMarcFile}`, content, 'binary');
            },
          );
        })
        .then(() => {
          DataImport.editMarcFieldsInAllRecords(
            testData.exportedMarcFile,
            testData.editedMarcFile,
            {
              editFields: [{ tag: '100', content: testData.updated100FieldContent }],
              addFields: [
                { tag: '400', indicators: ['1', '\\'], content: testData.added400FieldContent },
              ],
            },
          );
        })
        .then(() => {
          // Steps 1-3: upload the file and run the 999 ff $s update job profile
          DataImport.uploadFileViaApi(
            testData.editedMarcFile,
            testData.editedMarcFile,
            jobProfile.profileName,
          );
        })
        .then(() => {
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });
    });

    after('Deleting data', () => {
      cy.getAdminToken(false);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(testData.userProperties?.userId);
      if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID, true);
      FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.editedMarcFile}`);
      FileManager.deleteFile(`cypress/downloads/${testData.exportedMarcFile}`);
    });

    it(
      'C350668 Update a MARC authority record via data import. Record match with 999 ff $s (promin)',
      { tags: ['criticalPath', 'promin', 'C350668'] },
      () => {
        // Step 4: Wait for import to complete; verify the record is updated in the log
        Logs.waitFileIsImported(testData.editedMarcFile);
        Logs.checkJobStatus(testData.editedMarcFile, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.editedMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Wait until the updated heading is indexed - searching right after import can find nothing
        cy.getAdminToken(false);
        cy.recurse(
          () => MarcAuthorities.getMarcAuthoritiesViaApi({ query: `(id==${createdAuthorityID})` }),
          (authorities) => authorities.some(({ headingRef }) => headingRef === testData.updatedHeading),
          { limit: 30, timeout: 62_000, delay: 2_000 },
        );

        // Step 5: Search for the updated record in MARC authority app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy(testData.searchOption, testData.updatedHeading);

        // Step 6: Open the record; verify it was updated
        MarcAuthorities.selectTitle(testData.updatedHeading);
        MarcAuthority.contains(testData.updated100FieldContent);
        MarcAuthority.contains(testData.added400FieldContent);
      },
    );
  });
});
