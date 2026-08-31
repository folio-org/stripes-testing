import {
  APPLICATION_NAMES,
  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const randomPostfix = getRandomPostfix();
      const marcBibTitle = `AT_C387481_MarcBibInstance_${randomPostfix}`;

      // Unique initial 866 $a texts used as binary replacement anchors
      const tag866InitA = `AT_C387481_InitA_${randomPostfix}`;
      const tag866InitB = `AT_C387481_InitB_${randomPostfix}`;
      // Final 866 $a subfield texts after binary edit (without the $8/$a prefix)
      const tag866FinalA = `AT_C387481_A_${randomPostfix} Too few 008 positions (31)`;
      const tag866FinalB = `AT_C387481_B_${randomPostfix} Too much 008 positions (33)`;
      // Full field content as shown in QuickMARC UI (for assertions)
      const tag866ContentA = `$8 0 $a ${tag866FinalA}`;
      const tag866ContentB = `$8 0 $a ${tag866FinalB}`;

      // Holdings 008: 6-char date + 26 fill chars (backslash 0x5C) = 32 chars total.
      // String.fromCharCode(30) = field terminator byte 0x1E in MARC binary.
      // Replacing 26 backslashes+FT with 25/27 backslashes+FT gives 31/33-char 008.
      const fieldTerminator = String.fromCharCode(30);
      const tag008Tail = '\\'.repeat(26) + fieldTerminator;
      const tag008Tail31 = '\\'.repeat(25) + fieldTerminator;
      const tag008Tail33 = '\\'.repeat(27) + fieldTerminator;

      const csvFile1 = `AT_C387481_holdings1_${randomPostfix}.csv`;
      const csvFile2 = `AT_C387481_holdings2_${randomPostfix}.csv`;
      const exportedFile1 = `AT_C387481_exported1_${randomPostfix}.mrc`;
      const exportedFile2 = `AT_C387481_exported2_${randomPostfix}.mrc`;
      const combinedFile = `AT_C387481_combined_${randomPostfix}.mrc`;

      const mappingProfile = {
        name: `AT_C387481 Update MARC Holdings 999 ff $i ${randomPostfix}`,
      };
      const actionProfile = {
        name: `AT_C387481 Update MARC Holdings 999 ff $i ${randomPostfix}`,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
      };
      const matchProfile = {
        profileName: `AT_C387481 Update MARC Holdings 999 ff $i ${randomPostfix}`,
        incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 'i' },
        existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 'i' },
        recordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
      };
      const jobProfile = {
        profileName: `AT_C387481 Update MARC Holdings 999 ff $i ${randomPostfix}`,
      };

      let user;
      let instanceId;
      let holdingsId1;
      let holdingsId2;

      before('Create test data, export, edit 008, import via API, login', () => {
        cy.getAdminToken();

        // Create update job profile chain: FMP → AP → MP → JP
        SettingsFieldMappingProfiles.createMappingProfileViaApi({
          profile: {
            name: mappingProfile.name,
            incomingRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
            existingRecordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
            description: '',
            mappingDetails: {
              name: 'marcHoldings',
              recordType: EXISTING_RECORD_NAMES.MARC_HOLDINGS,
              marcMappingOption: 'UPDATE',
              mappingFields: [],
            },
          },
          addedRelations: [],
          deletedRelations: [],
        })
          .then(({ body }) => {
            return NewActionProfile.createActionProfileViaApi(actionProfile, body.id);
          })
          .then((apResponse) => {
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            ).then((mpResponse) => {
              NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                jobProfile.profileName,
                mpResponse.body.id,
                apResponse.body.id,
              );
            });
          });

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });

        // Create bib instance, 2 holdings; export each; edit 008 length and 866 content
        cy.getLocations({
          limit: 1,
          query: '(name<>"*autotest*" and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          cy.createSimpleMarcBibViaAPI(marcBibTitle).then((id) => {
            instanceId = id;
            cy.getInstanceById(id).then((instanceData) => {
              // Holdings record 1: 008 will be shortened to 31 chars
              cy.createMarcHoldingsViaAPI(instanceData.id, [
                { content: instanceData.hrid, tag: '004' },
                { content: QuickMarcEditor.defaultValid008HoldingsValues, tag: '008' },
                { content: `$b ${location.code}`, indicators: ['\\', '\\'], tag: '852' },
                { content: `$8 0 $a ${tag866InitA}`, indicators: ['4', '1'], tag: '866' },
              ]).then((hId) => {
                holdingsId1 = hId;
                FileManager.createFile(`cypress/fixtures/${csvFile1}`, holdingsId1);
                ExportFile.exportFileViaApi(
                  csvFile1,
                  'holding',
                  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
                ).then((completedJob) => {
                  ExportFile.downloadExportedMarcFileWithRecordHrid(
                    completedJob.hrId,
                    exportedFile1,
                  );
                  // Replace 866 $a content and shorten 008 from 32 to 31 chars
                  DataImport.editMarcFile(
                    exportedFile1,
                    exportedFile1,
                    [tag866InitA, tag008Tail],
                    [tag866FinalA, tag008Tail31],
                  );
                });
              });

              // Holdings record 2: 008 will be extended to 33 chars
              cy.createMarcHoldingsViaAPI(instanceData.id, [
                { content: instanceData.hrid, tag: '004' },
                { content: QuickMarcEditor.defaultValid008HoldingsValues, tag: '008' },
                { content: `$b ${location.code}`, indicators: ['\\', '\\'], tag: '852' },
                { content: `$8 0 $a ${tag866InitB}`, indicators: ['4', '1'], tag: '866' },
              ]).then((hId) => {
                holdingsId2 = hId;
                FileManager.createFile(`cypress/fixtures/${csvFile2}`, holdingsId2);
                ExportFile.exportFileViaApi(
                  csvFile2,
                  'holding',
                  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
                ).then((completedJob) => {
                  ExportFile.downloadExportedMarcFileWithRecordHrid(
                    completedJob.hrId,
                    exportedFile2,
                  );
                  // Replace 866 $a content and extend 008 from 32 to 33 chars
                  DataImport.editMarcFile(
                    exportedFile2,
                    exportedFile2,
                    [tag866InitB, tag008Tail],
                    [tag866FinalB, tag008Tail33],
                  );
                });
              });
            });
          });
        });

        // Combine both edited single-record .mrc files into one two-record file
        cy.then(() => {
          cy.readFile(`cypress/fixtures/${exportedFile1}`).then((content1) => {
            cy.readFile(`cypress/fixtures/${exportedFile2}`).then((content2) => {
              FileManager.createFile(`cypress/fixtures/${combinedFile}`, content1 + content2);
            });
          });
        });

        // Upload combined file with user token; login to Data Import UI
        cy.then(() => {
          cy.getToken(user.username, user.password);
          DataImport.uploadFileViaApi(combinedFile, combinedFile, jobProfile.profileName).then(
            () => {
              cy.login(user.username, user.password, {
                path: TopMenu.dataImportPath,
                waiter: DataImport.waitLoading,
              });
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user?.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(marcBibTitle);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        FileManager.deleteFile(`cypress/fixtures/${csvFile1}`);
        FileManager.deleteFile(`cypress/fixtures/${csvFile2}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedFile1}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedFile2}`);
        FileManager.deleteFile(`cypress/fixtures/${combinedFile}`);
        FileManager.deleteFile(`cypress/downloads/${exportedFile1}`);
        FileManager.deleteFile(`cypress/downloads/${exportedFile2}`);
      });

      it(
        'C387481 User can edit updated "MARC Holdings" file without required number (32) of "008" positions (promin)',
        { tags: ['extendedPath', 'promin', 'C387481'] },
        () => {
          // Steps 12-13: Verify import completed; open file details; both records show Updated
          Logs.checkJobStatus(combinedFile, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(combinedFile);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.holdings,
          );

          // Steps 14-15: Navigate to first holdings (31-char 008) → open in quickMARC
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstanceById(instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingViewByID(holdingsId1);
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.checkContentByTag('866', tag866ContentA);

          // Step 16: Edit 866 and a 008 position → save & close → detail view shown
          QuickMarcEditor.updateExistingField('866', `${tag866ContentA} UPD`);
          QuickMarcEditor.update008TextFields('Lang', 'ita');
          QuickMarcEditor.pressSaveAndClose();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.close();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Steps 17-18: Navigate to second holdings (33-char 008) → open in quickMARC
          InventoryInstance.openHoldingViewByID(holdingsId2);
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.checkContentByTag('866', tag866ContentB);

          // Step 19: Edit 866, 008 position, LDR Item → save & keep editing → editing window stays
          QuickMarcEditor.updateExistingField('866', `${tag866ContentB} UPD`);
          QuickMarcEditor.update008TextFields('Lang', 'ita');
          QuickMarcEditor.selectFieldsDropdownOption(
            'LDR',
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM,
            MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN.I,
          );
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
        },
      );
    });
  });
});
