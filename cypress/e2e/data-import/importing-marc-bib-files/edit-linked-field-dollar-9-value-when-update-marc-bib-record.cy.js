import uuid from 'uuid';
import {
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();
    const authPrefix = getRandomLetters(10);
    const naturalIds = {
      coates: `${authPrefix}380493001`,
      leeStan: `${authPrefix}380493002`,
    };

    const tag100 = '100';
    const tag245 = '245';
    const tag700 = '700';

    const instanceTitle = `AT_C380493_MarcBibInstance_${randomPostfix}`;
    const updatedInstanceTitle = `AT_C380493_MarcBibInstance_Updated_${randomPostfix}`;
    const authorityHeadings = {
      coates: `AT_C380493_MarcAuthority_Coates_${randomPostfix}`,
      leeStan: `AT_C380493_MarcAuthority_LeeStan_${randomPostfix}`,
    };
    // A different, but still validly-formatted, UUID - not tied to any real authority record
    const editedValidUuid = uuid();
    // An identifier in an invalid UUID format, matching TestRail's own example literally
    const editedInvalidUuid = '(AuCNLDY)3360609';

    const bibFields = [
      { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
      { tag: tag245, content: `$a ${instanceTitle}`, indicators: ['1', '1'] },
      {
        tag: tag100,
        content: `$a ${authorityHeadings.coates} $e author.`,
        indicators: ['1', '\\'],
      },
      {
        tag: tag700,
        content: `$a ${authorityHeadings.leeStan} $e creator.`,
        indicators: ['1', '\\'],
      },
    ];

    const mappingProfile = { name: `AT_C380493_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C380493_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const matchProfile = {
      profileName: `AT_C380493_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = { profileName: `AT_C380493_JobProfile_${randomPostfix}` };

    const csvFileName = `AT_C380493_export_${randomPostfix}.csv`;
    const exportedMarcFileName = `AT_C380493_exportedMarc_${randomPostfix}.mrc`;
    const modifiedMarcFileName = `AT_C380493_modifiedMarc_${randomPostfix}.mrc`;
    const importedFileName = `AT_C380493_importedFile_${randomPostfix}.mrc`;

    const authorityIds = {};
    let instanceId;
    let user;
    let modified245Content;

    before('Create test data via API', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380493_');
      InventoryInstances.deleteInstanceByTitleViaApi('C380493_');

      cy.then(() => {
        MarcAuthorities.createMarcAuthorityViaAPI(naturalIds.coates, '', [
          { tag: tag100, content: `$a ${authorityHeadings.coates}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          authorityIds.coates = id;
        });

        MarcAuthorities.createMarcAuthorityViaAPI(naturalIds.leeStan, '', [
          { tag: tag100, content: `$a ${authorityHeadings.leeStan}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          authorityIds.leeStan = id;
        });
      })
        .then(() => {
          // Create MARC bib record ("Black Panther" equivalent)
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
            (createdInstanceId) => {
              instanceId = createdInstanceId;
            },
          );
        })
        .then(() => {
          // Link 100 to Coates authority, 700 to Lee Stan authority
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId: instanceId,
            authorityIds: [authorityIds.coates, authorityIds.leeStan],
            bibFieldTags: [tag100, tag700],
            authorityFieldTags: [tag100, tag100],
            finalBibFieldContents: [
              `$a ${authorityHeadings.coates} $e author.`,
              `$a ${authorityHeadings.leeStan} $e creator.`,
            ],
          });
        })
        .then(() => {
          // Export MARC bib to get a file with 999 ff $i/$s embedded
          FileManager.createFile(`cypress/fixtures/${csvFileName}`, instanceId);
        })
        .then(() => {
          ExportFile.exportFileViaApi(csvFileName).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFileName);
          });
        })
        .then(() => {
          // Read the exact linked field content to edit only the $9 value, leaving $a/$e/$0
          // untouched - safer than reconstructing the content string from scratch
          cy.getMarcRecordDataViaAPI(instanceId).then((marcData) => {
            const field100 = marcData.fields.find((field) => field.tag === tag100);
            const field700 = marcData.fields.find((field) => field.tag === tag700);
            const field245 = marcData.fields.find((field) => field.tag === tag245);

            const modified100Content = field100.content.replace(
              authorityIds.coates,
              editedValidUuid,
            );
            const modified700Content = field700.content.replace(
              authorityIds.leeStan,
              editedInvalidUuid,
            );
            modified245Content = `${field245.content} Test`;

            // Apply modifications to the exported MARC file (equivalent of editing in MarcEdit):
            //   Step 6: edit $9 of 100 (Coates) to a different, but still valid, UUID
            //   Step 7: edit $9 of 700 (Lee Stan) to an invalid UUID format
            //   Step 8: edit 245 $a - append "Test"
            DataImport.editMarcFieldsInAllRecords(exportedMarcFileName, modifiedMarcFileName, {
              editFields: [
                { tag: tag100, content: modified100Content },
                { tag: tag700, content: modified700Content },
                { tag: tag245, content: modified245Content },
              ],
            });
          });
        })
        .then(() => {
          // Create Data Import profiles: mapping (MARC Bib "Updates"), action (UPDATE MARC
          // Bibliographic), match (999 ff $s MARC Bib to MARC Bib), job profile
          return NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(
            mappingProfile,
          ).then(({ body }) => {
            mappingProfile.id = body.id;

            return NewActionProfile.createActionProfileViaApi(
              actionProfile,
              mappingProfile.id,
            ).then((apResponse) => {
              actionProfile.id = apResponse.body.id;

              return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                matchProfile,
              ).then((mpResponse) => {
                matchProfile.id = mpResponse.body.id;

                return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  jobProfile.profileName,
                  matchProfile.id,
                  actionProfile.id,
                );
              });
            });
          });
        })
        .then(() => {
          // Import the modified file via API
          return DataImport.uploadFileViaApi(
            modifiedMarcFileName,
            importedFileName,
            jobProfile.profileName,
          );
        })
        .then(() => {
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Object.values(authorityIds).forEach((id) => MarcAuthority.deleteViaAPI(id, true));
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${modifiedMarcFileName}`);
        FileManager.deleteFile(`cypress/downloads/${exportedMarcFileName}`);
      });
    });

    it(
      'C380493 Edit "$9" value in the linked field when update "MARC Bib" record (promin)',
      { tags: ['extendedPath', 'promin', 'C380493'] },
      () => {
        // Step 12: verify the import job completed and the SRS MARC/Instance were updated
        Logs.waitFileIsImported(importedFileName);
        Logs.checkJobStatus(importedFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(importedFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.instance,
        );

        // Step 13: open the updated Instance in Inventory
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 14: open Edit MARC bibliographic record; 245 was updated per step 8's edit
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkContentByTag(tag245, modified245Content);

        // Step 15: 100 and 700 are still linked, even though their $9 values were edited to a
        // different valid UUID (100) and an invalid UUID format (700) - quickMarc's "linked"
        // state only depends on $9 being present, not on it resolving to a real authority
        QuickMarcEditor.verifyRowLinkedByTag(tag100, {
          isLinked: true,
          contentPart: authorityHeadings.coates,
        });
        QuickMarcEditor.verifyRowLinkedByTag(tag700, {
          isLinked: true,
          contentPart: authorityHeadings.leeStan,
        });

        // Step 16: update 245 again and save & keep editing - linked fields remain linked
        QuickMarcEditor.updateExistingField(tag245, `$a ${updatedInstanceTitle}`);
        QuickMarcEditor.clickSaveAndKeepEditing();

        QuickMarcEditor.verifyRowLinkedByTag(tag100, {
          isLinked: true,
          contentPart: authorityHeadings.coates,
        });
        QuickMarcEditor.verifyRowLinkedByTag(tag700, {
          isLinked: true,
          contentPart: authorityHeadings.leeStan,
        });
      },
    );
  });
});
