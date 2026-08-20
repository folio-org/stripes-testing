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
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const testData = {
        sharedInstanceId: [],
        contributorName: 'Coates, Ta-Nehisi (C407696)',
        contributorType: 'Producer',
        absentContributorName: 'Stelfreeze, Brian (to be removed)',
        instanceTitle: 'C407696 Marvel comics direct distributors meeting / Marvel Comics Group.',
        marcAuthIcon: 'Linked to MARC authority',
      };
      // unique file name to upload
      const nameForUpdatedMarcFile = `C407696autotestFile${getRandomPostfix()}.mrc`;
      const nameForExportedMarcFile = `C407696autotestFile${getRandomPostfix()}.mrc`;
      const nameForCSVFile = `C407696autotestFile${getRandomPostfix()}.csv`;
      const marcFiles = [
        {
          marc: 'marcBibFileForC407696.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          numOfRecords: 1,
        },
        {
          marc: 'marcAuthFileForC407696.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
          numOfRecords: 3,
        },
      ];
      const linkingTagAndValues = [
        {
          rowIndex: 20,
          value: 'C407696 Marvel comics',
          tag: '630',
          content:
            '$a C407696 Marvel comics $t Comiket $v Periodicals. $z United States $w 830 $0 800269554076962001 $2 fast',
        },
        {
          rowIndex: 21,
          value: 'C407696 Speaking Oratory',
          tag: '650',
          content: '$a C407696 Speaking Oratory $b debating $2 fast',
        },
        {
          rowIndex: 26,
          value: 'C407696 Radio "Vaticana".',
          tag: '710',
          boxFourth: '$a C407696 Radio "Vaticana". $b Hrvatski program',
          boxFifth: '',
          boxSixth: '$0 http://id.loc.gov/authorities/names/n93094742407696',
          boxSeventh: '',
        },
      ];

      const Dropdowns = {
        HELDBY: 'Held by',
      };

      const mappingProfile = {
        name: `C407696 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      };
      const actionProfile = {
        name: `C407696 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        action: 'UPDATE',
        folioRecordType: 'MARC_BIBLIOGRAPHIC',
      };
      const matchProfile = {
        profileName: `C407696 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      const jobProfileName = `C407696 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;
      const createdAuthorityIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: 'keyword="C407696" and (authRefType==("Authorized" or "Auth/Ref"))',
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
          Permissions.consortiaCentralAll.gui,
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
              Permissions.consortiaCentralAll.gui,
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
              Permissions.consortiaCentralAll.gui,
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
              cy.loginAsAdmin({
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
            InventoryInstances.waitContentLoading();
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
            cy.resetTenant();
            cy.setTenant(Affiliations.College);
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

            cy.resetTenant();
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });

            InventoryInstances.waitContentLoading();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
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
      });

      it(
        'C407696 Updating "$0" in linked fields of shared "MARC Bib" in member tenant via Data Import (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C407696'] },
        () => {
          cy.setTenant(Affiliations.College);
          InventorySearchAndFilter.clearDefaultFilter(Dropdowns.HELDBY);
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

          DataImport.editMarcFile(
            nameForExportedMarcFile,
            nameForUpdatedMarcFile,
            [
              'tComiCon',
              '0800269554076962',
              '0http://id.loc.gov/authorities/subjects/sh850952994076963',
              'n93094742407696',
            ],
            ['tComiket', '0800269554076962001', '', 'n930947424076960123456333'],
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

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.verifyPanesExist();
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);

          InventoryInstance.viewSource();
          InventoryViewSource.contains(
            '\t630\t   \t$a C407696 Marvel comics $t Comiket $v Periodicals. $z United States $w 830 $0 800269554076962001 $2 fast',
          );
          InventoryViewSource.contains(
            '\t650\t   \t$a C407696 Speaking Oratory $b debating $2 fast',
          );
          InventoryViewSource.contains(
            `${testData.marcAuthIcon}\n\t710\t   \t$a C407696 Radio "Vaticana". $b Hrvatski program $0 http://id.loc.gov/authorities/names/n93094742407696 $9`,
          );
          InventoryViewSource.close();

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventorySearchAndFilter.verifyPanesExist();
          InventorySearchAndFilter.clearDefaultFilter(Dropdowns.HELDBY);
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterUnlinking(
            linkingTagAndValues[0].rowIndex,
            linkingTagAndValues[0].tag,
            '\\',
            '\\',
            linkingTagAndValues[0].content,
          );
          QuickMarcEditor.verifyTagFieldAfterUnlinking(
            linkingTagAndValues[1].rowIndex,
            linkingTagAndValues[1].tag,
            '\\',
            '\\',
            linkingTagAndValues[1].content,
          );
          QuickMarcEditor.verifyTagFieldAfterLinking(
            linkingTagAndValues[2].rowIndex,
            linkingTagAndValues[2].tag,
            '\\',
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
