import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit', () => {
      const randomPostfix = getRandomPostfix();

      // Record 1: 008 will be edited to 41 chars ("extra" positions)
      const title1 = `AT_C387465_MarcBibInstance_1_${randomPostfix}`;
      const title1Updated = `${title1} more than 40 characters`;

      // Record 2: 008 will be edited to 39 chars ("too few" positions)
      const title2 = `AT_C387465_MarcBibInstance_2_${randomPostfix}`;
      const title2Updated = `${title2} less than 40 characters`;

      // Exact byte content of "008" doesn't matter for this test - only its length does, so an
      // all-blank ("\") string of the right length is used for both the "extra"/"too few" cases
      const tag008Content41 = '\\'.repeat(41);
      const tag008Content39 = '\\'.repeat(39);

      const exportedFile1 = `AT_C387465_exported1_${randomPostfix}.mrc`;
      const exportedFile2 = `AT_C387465_exported2_${randomPostfix}.mrc`;
      const editedFile1 = `AT_C387465_edited1_${randomPostfix}.mrc`;
      const editedFile2 = `AT_C387465_edited2_${randomPostfix}.mrc`;
      const combinedFile = `AT_C387465_combined_${randomPostfix}.mrc`;

      const mappingProfile = {
        name: `AT_C387465 Update MARC Bib records by matching 999 ff $s ${randomPostfix}`,
      };
      const actionProfile = {
        name: `AT_C387465 Update MARC Bib records by matching 999 ff $s ${randomPostfix}`,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const matchProfile = {
        profileName: `AT_C387465 Update MARC Bib records by matching 999 ff $s ${randomPostfix}`,
        incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const jobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `AT_C387465 Update MARC Bib records by matching 999 ff $s ${randomPostfix}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      const marcBibFields1 = [
        { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
        { tag: '245', content: `$a ${title1}`, indicators: ['1', '1'] },
      ];
      const marcBibFields2 = [
        { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
        { tag: '245', content: `$a ${title2}`, indicators: ['1', '1'] },
      ];

      let user;
      let instanceId1;
      let instanceId2;

      before('Create test data, export, edit 008, import via API, login', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C387465');

        NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile)
          .then((fmpResponse) => {
            mappingProfile.id = fmpResponse.body.id;
            return NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id);
          })
          .then((apResponse) => {
            actionProfile.id = apResponse.body.id;
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            );
          })
          .then((mpResponse) => {
            matchProfile.id = mpResponse.body.id;
            NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              matchProfile.id,
              actionProfile.id,
            );
          });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });

        // Steps 1-3: Create record 1 via API, export, edit 008 to 41 chars and update title
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields1).then(
          (id) => {
            instanceId1 = id;
            cy.downloadDataExportRecordViaApi(id, 'INSTANCE').then((body) => {
              FileManager.createFile(`cypress/fixtures/${exportedFile1}`, body);
              DataImport.editMarcFieldsInAllRecords(exportedFile1, editedFile1, {
                editFields: [
                  { tag: '008', content: tag008Content41 },
                  { tag: '245', content: `$a ${title1Updated}`, indicators: ['1', '1'] },
                ],
              });
            });
          },
        );

        // Create record 2 via API, export, edit 008 to 39 chars and update title
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields2).then(
          (id) => {
            instanceId2 = id;
            cy.downloadDataExportRecordViaApi(id, 'INSTANCE').then((body) => {
              FileManager.createFile(`cypress/fixtures/${exportedFile2}`, body);
              DataImport.editMarcFieldsInAllRecords(exportedFile2, editedFile2, {
                editFields: [
                  { tag: '008', content: tag008Content39 },
                  { tag: '245', content: `$a ${title2Updated}`, indicators: ['1', '1'] },
                ],
              });
            });
          },
        );

        // Combine both single-record files into one two-record .mrc file
        cy.then(() => {
          cy.readFile(`cypress/fixtures/${editedFile1}`).then((content1) => {
            cy.readFile(`cypress/fixtures/${editedFile2}`).then((content2) => {
              FileManager.createFile(`cypress/fixtures/${combinedFile}`, content1 + content2);
            });
          });
        });

        // Steps 4-5: Upload combined file via API with user token; login to Data Import
        cy.then(() => {
          cy.getToken(user.username, user.password);
          DataImport.uploadFileViaApi(combinedFile, combinedFile, jobProfile.profileName);

          cy.login(user.username, user.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(user?.userId);
        if (instanceId1) InventoryInstance.deleteInstanceViaApi(instanceId1);
        if (instanceId2) InventoryInstance.deleteInstanceViaApi(instanceId2);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        FileManager.deleteFile(`cypress/fixtures/${exportedFile1}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedFile2}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFile1}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFile2}`);
        FileManager.deleteFile(`cypress/fixtures/${combinedFile}`);
      });

      it(
        'C387465 User can edit updated "MARC Bib" file without required number (40) of "008" positions (promin)',
        { tags: ['extendedPath', 'promin', 'C387465'] },
        () => {
          // Steps 5-6: Verify import completed; open file details; both records show Updated
          Logs.checkJobStatus(combinedFile, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(combinedFile);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.instance,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.srsMarc,
            1,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.instance,
            1,
          );

          // Step 7: click the "Updated" hyperlink for record 1 (41-char 008) -> Inventory detail view
          FileDetails.openInstanceInInventoryByTitle(title1Updated, RECORD_STATUSES.UPDATED);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkInstanceTitle(title1Updated);

          // Step 8: Actions > Edit MARC bibliographic record -> QuickMARC opens
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Step 9: edit at least one "008" position and the "245" field, Save & close
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField('245', `$a ${title1Updated} edited`);
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkInstanceTitle(`${title1Updated} edited`);
          InventorySearchAndFilter.closeInstanceDetailPane();

          // Steps 10-11: find record 2 (39-char 008) -> Inventory detail view
          InventoryInstances.searchByTitle(title2Updated);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkInstanceTitle(title2Updated);

          // Step 12: Actions > Edit MARC bibliographic record -> QuickMARC opens
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkOnlyBackslashesIn008Boxes();

          // Step 13: edit at least one "008" position and the "245" field, Save & keep editing
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField('245', `$a ${title2Updated} edited`);
          QuickMarcEditor.clickSaveAndKeepEditing({ checkCallout: true });
        },
      );
    });
  });
});
