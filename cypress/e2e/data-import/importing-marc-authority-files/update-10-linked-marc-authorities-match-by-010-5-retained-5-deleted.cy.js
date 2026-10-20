import { EXISTING_RECORD_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
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
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const authorityPrefix = `AT_C624319_MarcAuthority_${randomPostfix}`;
    const bibPrefix = `AT_C624319_MarcBibInstance_${randomPostfix}`;
    const retainedSuffix = 'UPDATED by 010 match';
    const deletedSuffix = 'UPDATED by 010 match (link is deleted)';
    const randomDigits = randomNDigitNumber(15);

    const mappingProfile = { name: `AT_C624319_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C624319_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C624319_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '010', in1: '', in2: '', subfield: 'a' },
      existingRecordFields: { field: '010', in1: '', in2: '', subfield: 'a' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C624319 Update MARC authority records by matching 010 $a ${randomPostfix}`,
    };

    const combinedEditedFile = `AT_C624319_combinedUpdate_${randomPostfix}.mrc`;

    // Tags follow the TestRail precondition table exactly, in order (records 1-10):
    // 650,700,655,650,110 (retained) then 650,100,650,100,650 (broken). Broken records get their
    // authority's 1XX swapped to a tag with no linking rule for that same bib field (650's rule
    // target is 150, so swapping to 100 breaks it; 100's rule target is 100, so swapping to 150
    // breaks it).
    const recordsData = [
      { bibTag: '650', authTag: '150', indicators: ['\\', '0'], remainsLinked: true },
      { bibTag: '700', authTag: '100', indicators: ['1', '\\'], remainsLinked: true },
      { bibTag: '655', authTag: '155', indicators: ['\\', '7'], remainsLinked: true },
      { bibTag: '650', authTag: '150', indicators: ['\\', '0'], remainsLinked: true },
      { bibTag: '110', authTag: '110', indicators: ['2', '\\'], remainsLinked: true },
      {
        bibTag: '650',
        authTag: '150',
        indicators: ['\\', '0'],
        newAuthTag: '100',
        newIndicators: ['1', '\\'],
        remainsLinked: false,
      },
      {
        bibTag: '100',
        authTag: '100',
        indicators: ['1', '\\'],
        newAuthTag: '150',
        newIndicators: ['\\', '0'],
        remainsLinked: false,
      },
      {
        bibTag: '650',
        authTag: '150',
        indicators: ['\\', '0'],
        newAuthTag: '100',
        newIndicators: ['1', '\\'],
        remainsLinked: false,
      },
      {
        bibTag: '100',
        authTag: '100',
        indicators: ['1', '\\'],
        newAuthTag: '150',
        newIndicators: ['\\', '0'],
        remainsLinked: false,
      },
      {
        bibTag: '650',
        authTag: '150',
        indicators: ['\\', '0'],
        newAuthTag: '100',
        newIndicators: ['1', '\\'],
        remainsLinked: false,
      },
    ].map((rec, index) => {
      const n = index + 1;
      return {
        ...rec,
        heading: `${authorityPrefix}_${n}`,
        naturalId: `${randomDigits}624319${n}`,
        bibTitle: `${bibPrefix}_${n}`,
        csvFile: `AT_C624319_uuids${n}_${randomPostfix}.csv`,
        exportedFile: `AT_C624319_exported${n}_${randomPostfix}.mrc`,
        editedFile: `AT_C624319_edited${n}_${randomPostfix}.mrc`,
      };
    });

    let user;

    before('Create test data, job profiles, login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C624319_');
      InventoryInstances.deleteInstanceByTitleViaApi('C624319_');

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
          // Create each authority (with a matchable "010 $a") and bib, then link them
          recordsData.forEach((rec) => {
            MarcAuthorities.createMarcAuthorityViaAPI(rec.naturalId, '', [
              { tag: '010', content: `$a ${rec.naturalId}`, indicators: ['\\', '\\'] },
              { tag: rec.authTag, content: `$a ${rec.heading}`, indicators: rec.indicators },
            ]).then((id) => {
              rec.authorityId = id;
            });

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
              { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
              { tag: '245', content: `$a ${rec.bibTitle}`, indicators: ['1', '1'] },
              { tag: rec.bibTag, content: `$a ${rec.heading}`, indicators: rec.indicators },
            ]).then((id) => {
              rec.bibId = id;
            });

            cy.then(() => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: rec.bibId,
                authorityIds: [rec.authorityId],
                bibFieldTags: [rec.bibTag],
                authorityFieldTags: [rec.authTag],
                finalBibFieldContents: [`$a ${rec.heading}`],
              });
            });
          });
        })
        .then(() => {
          // Export each authority individually, then apply its own specific edit - a single
          // editMarcFieldsInAllRecords call can't vary the edit per record in a combined file
          recordsData.forEach((rec) => {
            FileManager.createFile(`cypress/fixtures/${rec.csvFile}`, rec.authorityId);

            cy.then(() => {
              ExportFile.exportFileViaApi(
                rec.csvFile,
                'authority',
                'Default authority export job profile',
              ).then(() => {
                ExportFile.downloadExportedMarcFile(rec.exportedFile);
              });
            })
              .then(() => {
                cy.readFile(`cypress/downloads/${rec.exportedFile}`, 'binary').then((content) => {
                  cy.writeFile(`cypress/fixtures/${rec.exportedFile}`, content, 'binary');
                });
              })
              .then(() => {
                if (rec.remainsLinked) {
                  DataImport.editMarcFieldsInAllRecords(rec.exportedFile, rec.editedFile, {
                    editFields: [
                      { tag: rec.authTag, content: `$a ${rec.heading} ${retainedSuffix}` },
                    ],
                  });
                } else {
                  DataImport.editMarcFieldsInAllRecords(rec.exportedFile, rec.editedFile, {
                    removeFields: [{ tag: rec.authTag }],
                    addFields: [
                      {
                        tag: rec.newAuthTag,
                        content: `$a ${rec.heading} ${deletedSuffix}`,
                        indicators: rec.newIndicators,
                      },
                    ],
                  });
                }
              });
          });
        })
        .then(() => {
          // Combine all 10 edited single-record files into one file for a single import run
          let combinedContent = '';
          recordsData.forEach((rec) => {
            cy.readFile(`cypress/fixtures/${rec.editedFile}`, 'binary').then((content) => {
              combinedContent += content;
            });
          });
          cy.then(() => {
            cy.writeFile(`cypress/fixtures/${combinedEditedFile}`, combinedContent, 'binary');
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.getToken(user.username, user.password);
            DataImport.uploadFileViaApi(
              combinedEditedFile,
              combinedEditedFile,
              jobProfile.profileName,
            );

            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user?.userId);
      recordsData.forEach((rec) => {
        if (rec.authorityId) MarcAuthority.deleteViaAPI(rec.authorityId, true);
        if (rec.bibId) InventoryInstance.deleteInstanceViaApi(rec.bibId);
        FileManager.deleteFile(`cypress/fixtures/${rec.csvFile}`);
        FileManager.deleteFile(`cypress/fixtures/${rec.exportedFile}`);
        FileManager.deleteFile(`cypress/fixtures/${rec.editedFile}`);
        FileManager.deleteFile(`cypress/downloads/${rec.exportedFile}`);
      });
      FileManager.deleteFile(`cypress/fixtures/${combinedEditedFile}`);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C624319 Update 10 linked MARC authority records which are linked to different MARC bibliographic records using 010 $a for match (5 links are retained, 5 links are deleted) (promin)',
      { tags: ['extendedPath', 'promin', 'C624319'] },
      () => {
        // Step 3: one Keyword search for the shared prefix surfaces all 10 updated headings and
        // their "Number of titles" at once, instead of switching apps/searching 10 times
        MarcAuthorities.searchBeats(authorityPrefix);
        recordsData.forEach((rec) => {
          if (rec.remainsLinked) {
            MarcAuthorities.verifyNumberOfTitlesForRowWithValue(
              `${rec.heading} ${retainedSuffix}`,
              '1',
            );
          } else {
            MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(
              `${rec.heading} ${deletedSuffix}`,
            );
          }
        });

        // Step 4: follow the "Number of titles" link only for the first (retained) record
        const firstRecord = recordsData[0];
        const firstUpdatedHeading = `${firstRecord.heading} ${retainedSuffix}`;
        MarcAuthorities.clickNumberOfTitlesByHeading(firstUpdatedHeading);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.checkInstanceTitle(firstRecord.bibTitle);

        // Steps 5-6: linked field is updated with the new heading and still shows as linked
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
          firstRecord.bibTag,
          firstRecord.indicators[0],
          firstRecord.indicators[1],
          `$a ${firstUpdatedHeading}`,
          '',
          `$0 ${firstRecord.naturalId}`,
          '',
        );

        // Step 7: for the remaining 9 records, search each bib directly (not via "Number of
        // titles", which is unavailable for the 5 broken-link records) and verify link state
        recordsData.slice(1).forEach((rec) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(rec.bibId);
          InventoryInstances.selectInstanceById(rec.bibId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkInstanceTitle(rec.bibTitle);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          if (rec.remainsLinked) {
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              rec.bibTag,
              rec.indicators[0],
              rec.indicators[1],
              `$a ${rec.heading} ${retainedSuffix}`,
              '',
              `$0 ${rec.naturalId}`,
              '',
            );
          } else {
            QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
              rec.bibTag,
              rec.indicators[0],
              rec.indicators[1],
              `$a ${rec.heading} $0 ${rec.naturalId}`,
            );
          }
        });
      },
    );
  });
});
