import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  PROFILE_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
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
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(10);
    const authPrefix = randomLetters;
    // Each authority gets a unique natural ID: prefix + sequential number
    const naturalIds = {
      leeStan: `${authPrefix}813008001`,
      stelfreeze: `${authPrefix}813008002`,
      kirby: `${authPrefix}813008003`,
      sprouse: `${authPrefix}813008004`,
      sabino: `${authPrefix}813008005`,
      robinson: `${authPrefix}813008006`,
    };

    const tag100 = '100';
    const tag110 = '110';
    const tag245 = '245';
    const tag700 = '700';
    const tag710 = '710';

    const instanceTitle = `AT_C813008_MarcBibInstance_${randomPostfix}`;
    const updatedInstanceTitle = `AT_C813008_MarcBibInstance_Updated_${randomPostfix}`;
    const martinHeading = `AT_C813008_Martin_${randomPostfix}`;

    const authorityHeadings = {
      leeStan: `AT_C813008_LeeStan_${randomPostfix}`,
      stelfreeze: `AT_C813008_Stelfreeze_${randomPostfix}`,
      kirby: `AT_C813008_Kirby_${randomPostfix}`,
      sprouse: `AT_C813008_Sprouse_${randomPostfix}`,
      sabino: `AT_C813008_Sabino_${randomPostfix}`,
      robinson: `AT_C813008_Robinson_${randomPostfix}`,
    };

    // MARC bib fields: Lee Stan, Stelfreeze, Kirby, Sprouse, Sabino, Martin (NOT linked), Robinson
    const bibFields = [
      { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
      { tag: tag245, content: `$a ${instanceTitle}`, indicators: ['1', '1'] },
      {
        tag: tag700,
        content: `$a ${authorityHeadings.leeStan} $e artist.`,
        indicators: ['1', '\\'],
      },
      {
        tag: tag700,
        content: `$a ${authorityHeadings.stelfreeze} $e artist.`,
        indicators: ['1', '\\'],
      },
      {
        tag: tag700,
        content: `$a ${authorityHeadings.kirby} $e creator.`,
        indicators: ['1', '\\'],
      },
      {
        tag: tag700,
        content: `$a ${authorityHeadings.sprouse} $e artist.`,
        indicators: ['1', '\\'],
      },
      {
        tag: tag700,
        content: `$a ${authorityHeadings.sabino} $e letterer.`,
        indicators: ['1', '\\'],
      },
      {
        tag: tag700,
        content: `$a ${martinHeading} $c (Comic book artist), $e colorist.`,
        indicators: ['1', '\\'],
      },
      { tag: tag710, content: `$a ${authorityHeadings.robinson}`, indicators: ['1', '\\'] },
    ];

    const mappingProfile = { name: `AT_C813008_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C813008_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      // Key difference from standard MARC_BIBLIOGRAPHIC update: FOLIO record type = INSTANCE
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const matchProfile = {
      profileName: `AT_C813008_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = { profileName: `AT_C813008_JobProfile_${randomPostfix}` };

    const csvFileName = `AT_C813008_export_${randomPostfix}.csv`;
    const exportedMarcFileName = `AT_C813008_exportedMarc_${randomPostfix}.mrc`;
    const modifiedMarcFileName = `AT_C813008_modifiedMarc_${randomPostfix}.mrc`;
    const importedFileName = `AT_C813008_importedFile_${randomPostfix}.mrc`;

    const authorityIds = {};
    let instanceId;
    let user;

    before('Create test data via API', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C813008_');
      InventoryInstances.deleteInstanceByTitleViaApi('C813008_');

      cy.then(() => {
        // Create 6 authority records
        MarcAuthorities.createMarcAuthorityViaAPI(naturalIds.leeStan, '', [
          { tag: tag100, content: `$a ${authorityHeadings.leeStan}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          authorityIds.leeStan = id;
        });

        MarcAuthorities.createMarcAuthorityViaAPI(naturalIds.stelfreeze, '', [
          { tag: tag100, content: `$a ${authorityHeadings.stelfreeze}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          authorityIds.stelfreeze = id;
        });

        MarcAuthorities.createMarcAuthorityViaAPI(naturalIds.kirby, '', [
          { tag: tag100, content: `$a ${authorityHeadings.kirby}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          authorityIds.kirby = id;
        });

        MarcAuthorities.createMarcAuthorityViaAPI(naturalIds.sprouse, '', [
          { tag: tag100, content: `$a ${authorityHeadings.sprouse}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          authorityIds.sprouse = id;
        });

        MarcAuthorities.createMarcAuthorityViaAPI(naturalIds.sabino, '', [
          { tag: tag100, content: `$a ${authorityHeadings.sabino}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          authorityIds.sabino = id;
        });

        MarcAuthorities.createMarcAuthorityViaAPI(naturalIds.robinson, '', [
          // Corporate name authority → 110 (links to 710 in bib)
          { tag: tag110, content: `$a ${authorityHeadings.robinson}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          authorityIds.robinson = id;
        });
      })
        .then(() => {
          // Create MARC bib record
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
            (createdInstanceId) => {
              instanceId = createdInstanceId;
            },
          );
        })
        .then(() => {
          // Determine field indices dynamically (records-editor injects control fields that shift positions)
          cy.getMarcRecordDataViaAPI(instanceId).then((marcData) => {
            const tagIndices = {};
            let tag700count = 0;

            marcData.fields.forEach((field, idx) => {
              const oneBased = idx + 1;
              if (field.tag === tag700) {
                if (tag700count === 0) tagIndices.leeStanIdx = oneBased;
                if (tag700count === 1) tagIndices.stelfreezeIdx = oneBased;
                if (tag700count === 2) tagIndices.kirbyIdx = oneBased;
                if (tag700count === 3) tagIndices.sprouseIdx = oneBased;
                if (tag700count === 4) tagIndices.sabinoIdx = oneBased;
                // occurrence 5 (Martin) is NOT linked - skip
                tag700count++;
              }
              if (field.tag === tag710) tagIndices.robinsonIdx = oneBased;
            });

            // Link the 5 personal-name 700 fields + Robinson 710 field to their authorities
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: instanceId,
              authorityIds: [
                authorityIds.leeStan,
                authorityIds.stelfreeze,
                authorityIds.kirby,
                authorityIds.sprouse,
                authorityIds.sabino,
                authorityIds.robinson,
              ],
              bibFieldTags: [tag700, tag700, tag700, tag700, tag700, tag710],
              authorityFieldTags: [tag100, tag100, tag100, tag100, tag100, tag110],
              finalBibFieldContents: [
                `$a ${authorityHeadings.leeStan} $e artist.`,
                `$a ${authorityHeadings.stelfreeze} $e artist.`,
                `$a ${authorityHeadings.kirby} $e creator.`,
                `$a ${authorityHeadings.sprouse} $e artist.`,
                `$a ${authorityHeadings.sabino} $e letterer.`,
                `$a ${authorityHeadings.robinson}`,
              ],
              bibFieldIndexes: [
                tagIndices.leeStanIdx,
                tagIndices.stelfreezeIdx,
                tagIndices.kirbyIdx,
                tagIndices.sprouseIdx,
                tagIndices.sabinoIdx,
                tagIndices.robinsonIdx,
              ],
            });
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
          // Apply modifications to the exported MARC file:
          //   Step 4: delete $0 from Stelfreeze 700 (occ 1)
          //   Step 5: append "test" to Kirby's $0 URL (occ 2)
          //   Steps 6+7: edit Sprouse's $e and $a (occ 3)
          //   Step 8: edit Martin's $a (occ 5, unlinked)
          //   Step 9: delete entire Robinson 710 field (removeTags)
          //   Step 10: delete $9 from Sabino 700 (occ 4)
          DataImport.editMarcFieldsInAllRecords(exportedMarcFileName, modifiedMarcFileName, {
            removeTags: [tag710],
            editFields: [
              {
                tag: tag700,
                occurrence: 1,
                // Stelfreeze: remove $0 (keep $a, $e, $9)
                content: `$a ${authorityHeadings.stelfreeze} $e artist. $9 ${authorityIds.stelfreeze}`,
              },
              {
                tag: tag700,
                occurrence: 2,
                // Kirby: append "test" to $0 → authority lookup will fail → unlinked
                content: `$a ${authorityHeadings.kirby} $e creator. $0 ${naturalIds.kirby}test $9 ${authorityIds.kirby}`,
              },
              {
                tag: tag700,
                occurrence: 3,
                // Sprouse: modify controlled $a and uncontrolled $e; keep $0 and $9 so field stays linked
                content: `$a ${authorityHeadings.sprouse} testing $e artist updated. $0 ${naturalIds.sprouse} $9 ${authorityIds.sprouse}`,
              },
              {
                tag: tag700,
                occurrence: 4,
                // Sabino: remove $9 but keep $0 → FOLIO re-links via $0
                content: `$a ${authorityHeadings.sabino} $e letterer. $0 ${naturalIds.sabino}`,
              },
              {
                tag: tag700,
                occurrence: 5,
                // Martin: modify $a (not linked, no $0/$9 to worry about)
                content: `$a ${martinHeading} updated $c (Comic book artist), $e colorist.`,
              },
            ],
          });
        })
        .then(() => {
          // Create Data Import profiles: mapping (MARC Bib → Instance), action (UPDATE Instance),
          // match (999 ff $s MARC Bib to MARC Bib), job profile
          const mappingProfileBody = {
            profile: {
              name: mappingProfile.name,
              incomingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
              mappingDetails: {
                name: 'instance',
                recordType: EXISTING_RECORD_NAMES.INSTANCE,
                mappingFields: [],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          };

          SettingsFieldMappingProfiles.createMappingProfileViaApi(mappingProfileBody).then(
            ({ body: { id: mappingProfileId } }) => {
              mappingProfile.id = mappingProfileId;

              const actionProfileBody = {
                profile: {
                  name: actionProfile.name,
                  action: 'UPDATE',
                  folioRecord: EXISTING_RECORD_NAMES.INSTANCE,
                },
                addedRelations: [
                  {
                    masterProfileId: null,
                    masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                    detailProfileId: mappingProfileId,
                    detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
                  },
                ],
                deletedRelations: [],
              };

              SettingsActionProfiles.createActionProfileViaApi(actionProfileBody).then(
                ({ body: apBody }) => {
                  actionProfile.id = apBody.id;

                  NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                    matchProfile,
                  ).then((mpResponse) => {
                    matchProfile.id = mpResponse.body.id;

                    NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                      jobProfile.profileName,
                      matchProfile.id,
                      actionProfile.id,
                    );
                  });
                },
              );
            },
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
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
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
      'C813008 Update "MARC bib" record with linked fields when action/field mapping profile has FOLIO record type = Instance but Match profile has MARC bib for incoming/existing (promin)',
      { tags: ['criticalPath', 'promin', 'C813008'] },
      () => {
        // Step 12: Upload the modified MARC file via Data Import UI
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(modifiedMarcFileName, importedFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(importedFileName);
        Logs.checkJobStatus(importedFileName, JOB_STATUS_NAMES.COMPLETED);

        // Step 13: Open log details - verify "Updated" status for SRS MARC and Instance
        Logs.openFileDetails(importedFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.instance,
        );

        // Step 14: Click "Updated" link → instance detail view
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 15: Open Edit MARC bibliographic record, verify linked field states
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();

        // Stelfreeze (deleted $0): field gets unlinked
        QuickMarcEditor.verifyRowLinkedByTag(tag700, {
          isLinked: false,
          contentPart: authorityHeadings.stelfreeze,
        });

        // Kirby (modified $0 URL to invalid): field gets unlinked
        QuickMarcEditor.verifyRowLinkedByTag(tag700, {
          isLinked: false,
          contentPart: authorityHeadings.kirby,
        });

        // Sprouse ($9 preserved, $a modified but FOLIO reverts controlled subfield): stays linked
        QuickMarcEditor.verifyRowLinkedByTag(tag700, {
          isLinked: true,
          contentPart: authorityHeadings.sprouse,
        });

        // Martin (never linked, $a updated): stays unlinked
        QuickMarcEditor.verifyRowLinkedByTag(tag700, {
          isLinked: false,
          contentPart: martinHeading,
        });

        // Robinson 710 deleted entirely: no row with tag 710 exists in the editor
        QuickMarcEditor.checkTagAbsent(tag710);

        // Sabino ($9 deleted from import file, $0 still valid): FOLIO re-links via $0 → stays linked
        QuickMarcEditor.verifyRowLinkedByTag(tag700, {
          isLinked: true,
          contentPart: authorityHeadings.sabino,
        });

        // Step 16: Edit the 245 field
        QuickMarcEditor.updateExistingField(tag245, `$a ${updatedInstanceTitle}`);

        // Step 17: Save & keep editing; verify linked fields remain unchanged
        QuickMarcEditor.clickSaveAndKeepEditing();

        // Re-verify Sprouse and Sabino still linked after save
        QuickMarcEditor.verifyRowLinkedByTag(tag700, {
          isLinked: true,
          contentPart: authorityHeadings.sprouse,
        });
        QuickMarcEditor.verifyRowLinkedByTag(tag700, {
          isLinked: true,
          contentPart: authorityHeadings.sabino,
        });
      },
    );
  });
});
