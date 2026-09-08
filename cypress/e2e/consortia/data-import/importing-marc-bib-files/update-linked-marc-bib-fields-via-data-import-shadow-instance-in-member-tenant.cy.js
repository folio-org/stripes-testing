import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import { EXISTING_RECORD_NAMES } from '../../../../support/constants';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const SUBFIELD_DELIM = '\x1f';
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(15);
      const authData = { prefix: randomLetters, startWithNumber: 411801 };

      const tags = {
        tag008: '008',
        tag111: '111',
        tag150: '150',
        tag245: '245',
        tag650: '650',
        tag711: '711',
      };

      const bibTitle = `AT_C411801_MarcBibInstance_${randomPostfix}`;
      const authorityHeadingPrefix = `AT_C411801_MarcAuthority_${randomPostfix}`;

      const bibSubfields650 = {
        a: 'C411801 Good',
      };
      const bibSubfields711 = {
        a: 'C411801 Mostly Festival',
        e: 'Orch',
        4: 'prf',
        v: 'version 1',
      };
      const authSubfields150 = {
        a: `${authorityHeadingPrefix}_GoodAndEvil`,
        x: 'History',
      };
      const authSubfields111 = {
        a: `${authorityHeadingPrefix}_Chopin`,
        e: 'Orchestra',
        t: 'sonet',
        3: 'test',
        w: 'control',
      };

      const buildContent = (subfields) => Object.entries(subfields)
        .reduce((acc, [subfield, value]) => `${acc} $${subfield} ${value}`, '')
        .trim();

      const bib650Content = buildContent(bibSubfields650);
      const bib711Content = buildContent(bibSubfields711);

      const authorityFields150 = [
        {
          tag: tags.tag150,
          content: buildContent(authSubfields150),
          indicators: ['\\', '\\'],
        },
      ];
      const authorityFields111 = [
        {
          tag: tags.tag111,
          content: buildContent(authSubfields111),
          indicators: ['2', '\\'],
        },
      ];
      const bibFields = [
        { tag: tags.tag008, content: QuickMarcEditor.valid008ValuesInstance },
        { tag: tags.tag245, content: `$a ${bibTitle}`, indicators: ['1', '1'] },
        { tag: tags.tag650, content: bib650Content, indicators: ['\\', '0'] },
        { tag: tags.tag711, content: bib711Content, indicators: ['2', '\\'] },
      ];
      const field650ControlledContent = `$a ${authSubfields150.a}`;
      const field711ControlledContent = `$a ${authSubfields111.a} $e ${authSubfields111.e} $t ${authSubfields111.t}`;
      const field711UncontrolledContentOriginal = `$v ${bibSubfields711.v} $4 ${bibSubfields711['4']}`;

      const bibFieldsLinkedContentOriginal = {
        field650: field650ControlledContent,
        field711: `${field711ControlledContent} ${field711UncontrolledContentOriginal}`,
      };

      // Step 6 edits: $b is expected to be dropped by Data Import (per TestRail), $2 survives;
      // $v is deleted, $4 is updated, and $a update attempt on the linked 711 field is rejected (controlled)
      const field650AddedBSubfields = '$b one $b two';
      const field650AddedNumSubfields = '$2 first $2 second';
      const field650AddedSubfieldsContent = `${field650AddedBSubfields} ${field650AddedNumSubfields}`;
      const field711Updated4Value = 'new';
      const field711UncontrolledContentFinal = `$4 ${field711Updated4Value}`;
      const field711AttemptedAValue = 'C411801 Mostly Updated';

      // real MARC binary has no space between a subfield code and its value (unlike the "$x value" notation)
      const toRawSubfields = (content) => content
        .replace(/^\$/, '')
        .split(' $')
        .map((part) => `${SUBFIELD_DELIM}${part.replace(/^(.) /, '$1')}`)
        .join('');

      const mappingProfile = { name: `AT_C411801_Update MARC Bib ${randomPostfix}` };
      const actionProfile = {
        name: `AT_C411801_Update MARC Bib ${randomPostfix}`,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const matchProfile = {
        profileName: `AT_C411801_Match 999 ff $s ${randomPostfix}`,
        incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const jobProfile = {
        profileName: `AT_C411801_Update MARC Bib by matching 999 ff $s ${randomPostfix}`,
      };

      const csvFile = `AT_C411801_export${randomPostfix}.csv`;
      const exportedMarcFile = `AT_C411801_exportedMarcFile${randomPostfix}.mrc`;
      const modifiedMarcFile = `AT_C411801_modifiedMarcFile${randomPostfix}.mrc`;
      const importedFileName = `AT_C411801_importedFile${randomPostfix}.mrc`;

      const userPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.consortiaCentralAll.gui,
      ];

      let user;
      let createdInstanceId;
      let holdingId;
      const createdAuthorityIds = [];

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C411801_');
        cy.resetTenant();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C411801_');
        InventoryInstances.deleteFullInstancesByTitleViaApi('C411801_');

        cy.then(() => {
          // Create shared MARC Bib and shared MARC Authority records in Central
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;
            },
          );

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFields150,
          ).then((createdRecordId1) => {
            createdAuthorityIds.push(createdRecordId1);

            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber + 1,
              authorityFields111,
            ).then((createdRecordId2) => {
              createdAuthorityIds.push(createdRecordId2);
            });
          });
        })
          .then(() => {
            // Link 650 -> 150 ("Good and evil") and 711 -> 111 ("Chopin") via API
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: createdInstanceId,
              authorityIds: createdAuthorityIds,
              bibFieldTags: [tags.tag650, tags.tag711],
              authorityFieldTags: [tags.tag150, tags.tag111],
              finalBibFieldContents: [
                bibFieldsLinkedContentOriginal.field650,
                bibFieldsLinkedContentOriginal.field711,
              ],
            });
          })
          .then(() => {
            // Give the shared instance a Holdings record on Member 1 (College) - creates its "Shadow" copy there
            cy.setTenant(Affiliations.College);
            cy.getLocations({ limit: 1 }).then((location) => {
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: createdInstanceId,
                  permanentLocationId: location.id,
                  sourceId: folioSource.id,
                }).then((holding) => {
                  holdingId = holding.id;
                });
              });
            });
          })
          .then(() => {
            // Create job profile in Member 1 (College) tenant
            NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile)
              .then((matchProfileResponse) => {
                matchProfile.id = matchProfileResponse.body.id;
              })
              .then(() => {
                NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(
                  mappingProfile,
                ).then((mappingProfileResponse) => {
                  mappingProfile.id = mappingProfileResponse.body.id;
                });
              })
              .then(() => {
                NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
                  (actionProfileResponse) => {
                    actionProfile.id = actionProfileResponse.body.id;
                  },
                );
              })
              .then(() => {
                NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  jobProfile.profileName,
                  matchProfile.id,
                  actionProfile.id,
                );
              });
          })
          .then(() => {
            // Export the shared instance from Member 1 tenant
            FileManager.createFile(`cypress/fixtures/${csvFile}`, createdInstanceId);
          })
          .then(() => {
            ExportFile.exportFileViaApi(csvFile).then(() => {
              ExportFile.downloadExportedMarcFile(exportedMarcFile);
            });
          })
          .then(() => {
            // Step 6: add $b/$2 to linked 650; delete $v, update $4 and (attempt to) update $a in linked 711
            DataImport.editMarcFile(
              exportedMarcFile,
              modifiedMarcFile,
              [
                `${SUBFIELD_DELIM}9${createdAuthorityIds[0]}`,
                `${SUBFIELD_DELIM}v${bibSubfields711.v}`,
                `${SUBFIELD_DELIM}4${bibSubfields711['4']}`,
                `${SUBFIELD_DELIM}a${authSubfields111.a}`,
              ],
              [
                `${SUBFIELD_DELIM}9${createdAuthorityIds[0]}${toRawSubfields(field650AddedSubfieldsContent)}`,
                '',
                `${SUBFIELD_DELIM}4${field711Updated4Value}`,
                `${SUBFIELD_DELIM}a${field711AttemptedAValue}`,
              ],
            );
          })
          .then(() => {
            DataImport.uploadFileViaApi(modifiedMarcFile, importedFileName, jobProfile.profileName);
          })
          .then(() => {
            // User: primary affiliation = Member 1 (College); also Central and Member 2 (University)
            cy.createTempUser(userPermissions).then((userProperties) => {
              user = userProperties;

              cy.resetTenant();
              cy.assignAffiliationToUser(Affiliations.University, user.userId);
              cy.assignPermissionsToExistingUser(user.userId, userPermissions);

              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(user.userId, userPermissions);
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        cy.setTenant(Affiliations.College);
        InventoryHoldings.deleteHoldingRecordViaApi(holdingId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);

        cy.resetTenant();
        createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);

        FileManager.deleteFile(`cypress/fixtures/${csvFile}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${modifiedMarcFile}`);
        FileManager.deleteFile(`cypress/downloads/${exportedMarcFile}`);
      });

      it(
        'C411801 Updating subfields in a linked field of shared "MARC Bib" which has "Shadow" copy in member tenant via Data Import from member tenant (promin)',
        { tags: ['extendedPathECS', 'promin', 'C411801'] },
        () => {
          // Steps 9-11: Switch to Central tenant; verify updated linked fields via View source
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          InventoryInstances.waitContentLoading();

          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          InventoryInstance.viewSource();
          InventoryViewSource.verifyLinkedToAuthorityIconByTag(tags.tag650);
          InventoryViewSource.verifyLinkedToAuthorityIconByTag(tags.tag711);

          // 650: full sequence per TestRail - controlled $a, linking $0/$9, then surviving $2 additions
          InventoryViewSource.checkRowExistsWithTagAndValue(
            tags.tag650,
            `${field650ControlledContent} $0 ${authData.prefix}${authData.startWithNumber} ${field650AddedNumSubfields} $9 ${createdAuthorityIds[0]}`,
          );

          // 711: full sequence per TestRail - controlled $a/$e/$t, linking $0/$9, then updated $4
          InventoryViewSource.checkRowExistsWithTagAndValue(
            tags.tag711,
            `${field711ControlledContent} $0 ${authData.prefix}${authData.startWithNumber + 1} ${field711UncontrolledContentFinal} $9 ${createdAuthorityIds[1]}`,
          );
          InventoryViewSource.close();

          // Steps 12-14: Switch to Member 2 tenant; verify same fields in Edit MARC bibliographic record
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.clearDefaultHeldbyFilter();

          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
            tags.tag650,
            '\\',
            '0',
            field650ControlledContent,
            '',
            `$0 ${authData.prefix}${authData.startWithNumber}`,
            field650AddedNumSubfields,
          );
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
            tags.tag711,
            '2',
            '\\',
            field711ControlledContent,
            '',
            `$0 ${authData.prefix}${authData.startWithNumber + 1}`,
            field711UncontrolledContentFinal,
          );
        },
      );
    });
  });
});
