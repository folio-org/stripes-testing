import {
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const testData = {
        instanceTitle: 'C411802 Marvel comics direct distributors meeting / Marvel Comics Group.',
        collegeHoldings: [],
        marcAuthIcon: 'Linked to MARC authority',
      };
      function replace999SubfieldsInPreupdatedFile(
        exportedFileName,
        preUpdatedFileName,
        finalFileName,
      ) {
        FileManager.readFile(`cypress/fixtures/${exportedFileName}`).then((actualContent) => {
          const lines = actualContent.split('');
          const field999data = lines[lines.length - 2];
          FileManager.readFile(`cypress/fixtures/${preUpdatedFileName}`).then((updatedContent) => {
            const content = updatedContent.split('\n');
            let firstString = content[0].slice();
            firstString = firstString.replace(
              'ffi7b966b3d-c0ca-41db-8c35-90dc2e251a85s55f6796c-ac92-4986-a31a-1438baea665f',
              field999data,
            );
            content[0] = firstString;
            FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
          });
        });
      }
      // unique file name to upload
      const nameForUpdatedMarcFile = `C411802autotestFile${getRandomPostfix()}.mrc`;
      const nameForExportedMarcFile = `C411802autotestFile${getRandomPostfix()}.mrc`;
      const nameForCSVFile = `C411802autotestFile${getRandomPostfix()}.csv`;
      const nameForPreUpdatedMarcBibFile = 'C411802MarcBibPreUpdated.mrc';
      const marcFiles = [
        {
          marc: 'marcBibFileForC411802.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          numOfRecords: 1,
        },
        {
          marc: 'marcAuthFileForC411802.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
          numOfRecords: 3,
        },
      ];
      const linkingTagAndValues = [
        {
          rowIndex: 20,
          value: 'C411802 Marvel comics',
          tag: '630',
          content:
            '$a C411802 Marvel comics $t Comiket $v Periodicals. $z United States $w 830 $0 800269554076962001 $2 fast',
        },
        {
          rowIndex: 21,
          value: 'C411802 Speaking Oratory',
          tag: '650',
          content: '$a C411802 Speaking Oratory $b debating $2 fast',
        },
        {
          rowIndex: 26,
          value: 'C411802 Radio "Vaticana".',
          tag: '710',
          boxFourth: '$a C411802 Radio "Vaticana". $b Hrvatski program',
          boxFifth: '',
          boxSixth: '$0 http://id.loc.gov/authorities/names/n93094742407696',
          boxSeventh: '',
        },
      ];
      const mappingProfile = {
        name: `C411802 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      };
      const actionProfile = {
        name: `C411802 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        action: 'UPDATE',
        folioRecordType: 'MARC_BIBLIOGRAPHIC',
      };
      const matchProfile = {
        profileName: `C411802 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
        recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const jobProfileName = `C411802 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;
      const createdAuthorityIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: 'keyword="C411802" and (authRefType==("Authorized" or "Auth/Ref"))',
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id, true);
            });
          }
        });
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          Permissions.dataExportViewAddUpdateProfiles.gui,
        ])
          .then((userProperties) => {
            testData.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
            cy.assignAffiliationToUser(Affiliations.University, testData.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.moduleDataImportEnabled.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
              Permissions.dataExportViewAddUpdateProfiles.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.moduleDataImportEnabled.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
              Permissions.dataExportViewAddUpdateProfiles.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.loginAsAdmin();
              cy.visit(TopMenu.inventoryPath);
              InventoryInstances.waitContentLoading();
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            linkingTagAndValues.forEach((fields) => {
              QuickMarcEditor.clickLinkIconInTagField(fields.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(fields.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields.tag, fields.rowIndex);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          })
          .then(() => {
            NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile).then(
              (mappingProfileResponse) => {
                NewActionProfile.createActionProfileViaApi(
                  actionProfile,
                  mappingProfileResponse.body.id,
                ).then((actionProfileResponse) => {
                  NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                    matchProfile,
                  ).then((matchProfileResponse) => {
                    NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                      jobProfileName,
                      matchProfileResponse.body.id,
                      actionProfileResponse.body.id,
                    );
                  });
                });
              },
            );
          })
          .then(() => {
            // adding Holdings in College for shared Instance
            cy.setTenant(Affiliations.College);
            const collegeLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(collegeLocationData).then((location) => {
              testData.collegeLocation = location;
              InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
                (holdingSources) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: createdAuthorityIDs[0],
                    permanentLocationId: testData.collegeLocation.id,
                    sourceId: holdingSources[0].id,
                  }).then((holding) => {
                    testData.collegeHoldings.push(holding);
                  });
                },
              );
            });

            cy.resetTenant();
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
        FileManager.deleteFile(`cypress/fixtures/${nameForUpdatedMarcFile}`);
        cy.setTenant(Affiliations.College);
        testData.collegeHoldings.forEach((holding) => {
          InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
        });
        Locations.deleteViaApi(testData.collegeLocation);
      });

      it(
        'C411802 Updating "$0" in linked fields of shared "MARC Bib" which has "Shadow" copy in member tenant via Data Import from Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C411802'] },
        () => {
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          // download .csv file
          InventorySearchAndFilter.saveUUIDs();
          ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
          cy.visit(TopMenu.dataExportPath);
          // download exported marc file
          ExportFile.uploadFile(nameForCSVFile);
          ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
          ExportFile.downloadExportedMarcFile(nameForExportedMarcFile);
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
          cy.log('#####End Of Export#####');

          // add 999 subfield values from exported file to pre-updated file with field 100 deleted
          replace999SubfieldsInPreupdatedFile(
            nameForExportedMarcFile,
            nameForPreUpdatedMarcBibFile,
            nameForUpdatedMarcFile,
          );

          // upload the exported marc file with 999.f.f.s fields
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadFile(nameForUpdatedMarcFile, nameForUpdatedMarcFile);
          JobProfiles.waitLoadingList();
          JobProfiles.search(jobProfileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImportedForConsortia(nameForUpdatedMarcFile);
          Logs.checkJobStatus(nameForUpdatedMarcFile, 'Completed');
          Logs.openFileDetails(nameForUpdatedMarcFile);

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.verifyPanesExist();
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);

          InventoryInstance.viewSource();
          InventoryViewSource.contains(
            '\t630\t0 7\t$a C411802 Marvel comics $t Comiket $v Periodicals. $z United States $w 830 $0 800269554076962001 $2 fast',
          );
          InventoryViewSource.contains(
            '\t650\t  7\t$a C411802 Speaking Oratory $b debating $2 fast',
          );
          InventoryViewSource.contains(
            `${testData.marcAuthIcon}\n\t710\t2  \t$a C411802 Radio "Vaticana". $b Hrvatski program $0 http://id.loc.gov/authorities/names/n93094742407696 $9`,
          );
          InventoryViewSource.close();

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventorySearchAndFilter.verifyPanesExist();
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterUnlinking(
            linkingTagAndValues[0].rowIndex + 1,
            linkingTagAndValues[0].tag,
            '0',
            '7',
            linkingTagAndValues[0].content,
          );
          QuickMarcEditor.verifyTagFieldAfterUnlinking(
            linkingTagAndValues[1].rowIndex + 1,
            linkingTagAndValues[1].tag,
            '\\',
            '7',
            linkingTagAndValues[1].content,
          );
          QuickMarcEditor.verifyTagFieldAfterLinking(
            linkingTagAndValues[2].rowIndex + 1,
            linkingTagAndValues[2].tag,
            '2',
            '\\',
            linkingTagAndValues[2].boxFourth,
            linkingTagAndValues[2].boxFifth,
            linkingTagAndValues[2].boxSixth,
            linkingTagAndValues[2].boxSeventh,
          );
        },
      );
    });
  });
});
