import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const postfix = getRandomPostfix();
    const randomDigits = randomNDigitNumber(8);
    const csvFile = `C440105_export${postfix}.csv`;
    const exportedMarcFile = `C440105_exported${postfix}.mrc`;
    const modifiedMarcFile = `C440105_modified${postfix}.mrc`;
    const fileName = `C440105_autotestFile${postfix}.mrc`;

    const testData = {
      isbn1: `440105${randomDigits}`,
      isbn2: `440106${randomDigits}`,
      instanceTitle: `AT_C440105_MarcBibInstance_${postfix}`,
      instanceId: null,
      isbnTypeId: null,
      user: {},
      invalidSubfieldIValue: 'catsarecute',
      jsonLogErrorTextPart: 'externalIdsHolder.instanceId',
    };

    const mappingProfile = { name: `AT_C440105_MappingProfile_${postfix}` };
    const actionProfile = {
      name: `AT_C440105_ActionProfile_${postfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const matchProfile = {
      profileName: `AT_C440105_MatchProfile_${postfix}`,
      incomingRecordFields: { field: '020', in1: '', in2: '', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const jobProfile = { profileName: `AT_C440105_JobProfile_${postfix}` };

    before('Create test data via API', () => {
      cy.getAdminToken();

      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
        { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
        { tag: '020', content: `$a ${testData.isbn1}`, indicators: [' ', ' '] },
        { tag: '020', content: `$a ${testData.isbn2}`, indicators: [' ', ' '] },
        { tag: '245', content: `$a ${testData.instanceTitle}`, indicators: ['1', '0'] },
      ])
        .then((instanceId) => {
          testData.instanceId = instanceId;
          FileManager.createFile(`cypress/fixtures/${csvFile}`, instanceId);
        })
        .then(() => {
          ExportFile.exportFileViaApi(csvFile).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFile);
          });
        })
        .then(() => {
          DataImport.editMarcFile(
            exportedMarcFile,
            modifiedMarcFile,
            [testData.instanceId],
            [testData.invalidSubfieldIValue],
          );
        })
        .then(() => {
          cy.getInstanceIdentifierTypes({ query: 'name=="ISBN"', limit: '1' }).then(() => {
            testData.isbnTypeId = Cypress.env('identifierTypes')[0].id;
          });
        })
        .then(() => {
          NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
            (mappingProfileResponse) => {
              NewActionProfile.createActionProfileViaApi(
                actionProfile,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                NewMatchProfile.createMatchProfileWithIncomingAndExistingOCLCMatchExpressionViaApi({
                  ...matchProfile,
                  identifierTypeId: testData.isbnTypeId,
                }).then((matchProfileResponse) => {
                  NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                    jobProfile.profileName,
                    matchProfileResponse.body.id,
                    actionProfileResponse.body.id,
                  );
                });
              });
            },
          );
        })
        .then(() => {
          cy.createTempUser([
            Permissions.settingsDataImportEnabled.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.dataImportUploadAll.gui,
            Permissions.inventoryAll.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      FileManager.deleteFile(`cypress/fixtures/${csvFile}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${modifiedMarcFile}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFile}`);
      Users.deleteViaApi(testData.user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C440105 Check the 020a-to-ISBN match with file contains invalid 999ff$i field (promin)',
      { tags: ['extendedPath', 'promin', 'C440105'] },
      () => {
        // Steps 12-13: Upload modified MARC file with invalid 999ff$i and run import
        DataImport.verifyUploadState();
        DataImport.uploadFile(modifiedMarcFile, fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();

        // Step 14: Verify import log shows "No action" for Instance
        Logs.waitFileIsImported(fileName);
        Logs.openFileDetails(fileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.instance,
        );

        // Step 15: Click the Title hotlink and verify javax.validation error in Instance tab
        FileDetails.openJsonScreen(testData.instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openInstanceTab();
        JsonScreenView.verifyContentInTab(testData.jsonLogErrorTextPart);
      },
    );
  });
});
