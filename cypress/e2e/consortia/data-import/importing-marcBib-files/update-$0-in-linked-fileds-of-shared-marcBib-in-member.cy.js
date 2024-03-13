import { EXISTING_RECORDS_NAMES, FOLIO_RECORD_TYPE } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FileManager from '../../../../support/utils/fileManager';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../../support/fragments/settings/dataImport';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      sharedInstanceId: [],
      contributorName: 'Coates, Ta-Nehisi (C407696)',
      contributorType: 'Producer',
      absentContributorName: 'Stelfreeze, Brian (to be removed)',
      instanceTitle: 'C407696 Marvel comics direct distributors meeting / Marvel Comics Group.',
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
            'ffi7b966b3d-c0ca-41db-8c35-90dc2e251a85s55f6796c-ac92-4986-a31a-1438baea640e',
            field999data,
          );
          content[0] = firstString;
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
      });
    }
    // unique file name to upload
    const nameForUpdatedMarcFile = `C407696autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C407696autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C407696autotestFile${getRandomPostfix()}.csv`;
    const nameForPreUpdatedMarcBibFile = 'C407696MarcBibPreUpdated.mrc';
    const marcFiles = [
      {
        marc: 'marcBibFileForC407696.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
      },
      {
        marc: 'marcAuthFileForC407696.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 3,
      },
    ];
    const linkingTagAndValues = [
      {
        rowIndex: 21,
        value: 'C407696 Marvel comics',
        tag: '630',
        content:
          '$a C407696 Marvel comics $t Comiket $v Periodicals. $z United States $w 830 $0 800269554076962001 $2 fast',
      },
      {
        rowIndex: 22,
        value: 'C407696 Speaking Oratory',
        tag: '650',
        content: '$a C407696 Speaking Oratory $b debating $2 fast',
      },
      {
        rowIndex: 27,
        value: 'C407696 Radio "Vaticana".',
        tag: '710',
        boxFourth: '$a C407696 Radio "Vaticana". $b Hrvatski program',
        boxFifth: '',
        boxSixth: '$0 http://id.loc.gov/authorities/names/n93094742407696',
        boxSeventh: '',
      },
    ];
    const mappingProfile = {
      name: `C407696 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
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
      recordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfileName = `C407696 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;
    const createdAuthorityIDs = [];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportEnableApp.gui,
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
            Permissions.dataExportEnableApp.gui,
          ]);
        })
        .then(() => {
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
            Permissions.inventoryAll.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.dataExportEnableApp.gui,
          ]);
        })
        .then(() => {
          cy.resetTenant();
          cy.loginAsAdmin().then(() => {
            marcFiles.forEach((marcFile) => {
              cy.visit(TopMenu.dataImportPath);
              DataImport.verifyUploadState();
              DataImport.uploadFile(marcFile.marc, marcFile.fileName);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              Logs.waitFileIsImported(marcFile.fileName);
              Logs.checkJobStatus(marcFile.fileName, 'Completed');
              Logs.openFileDetails(marcFile.fileName);
              for (let i = 0; i < marcFile.numOfRecords; i++) {
                Logs.getCreatedItemsID(i).then((link) => {
                  createdAuthorityIDs.push(link.split('/')[5]);
                });
              }
            });
          });
        })
        .then(() => {
          cy.visit(TopMenu.inventoryPath);
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
              NewActionProfile.createActionProfileViaApiMarc(
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
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
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
    });

    it(
      'C407696 Updating "$0" in linked fields of shared "MARC Bib" in member tenant via Data Import (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire'] },
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
        Logs.waitFileIsImported(nameForUpdatedMarcFile);
        Logs.checkJobStatus(nameForUpdatedMarcFile, 'Completed');
        Logs.openFileDetails(nameForUpdatedMarcFile);

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.verifyPanesExist();
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);

        InventoryInstance.viewSource();
        InventoryViewSource.contains(
          '\t630\t0 7\t$a C407696 Marvel comics $t Comiket $v Periodicals. $z United States $w 830 $0 800269554076962001 $2 fast',
        );
        InventoryViewSource.contains('\t650\t  7\t$a C407696 Speaking Oratory $b debating $2 fast');
        InventoryViewSource.contains(
          `${testData.marcAuthIcon}\n\t710\t2  \t$a C407696 Radio "Vaticana". $b Hrvatski program $0 http://id.loc.gov/authorities/names/n93094742407696 $9`,
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
