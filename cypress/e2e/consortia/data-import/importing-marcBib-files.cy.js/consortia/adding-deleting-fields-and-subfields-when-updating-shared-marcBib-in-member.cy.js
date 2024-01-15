import Permissions from '../../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  FOLIO_RECORD_TYPE,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../../../support/constants';
import ActionProfiles from '../../../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../../../support/fragments/data_import/match_profiles/matchProfiles';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';
import FileManager from '../../../../../support/utils/fileManager';
import NewFieldMappingProfile from '../../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMatchProfile from '../../../../../support/fragments/data_import/match_profiles/newMatchProfile';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
import FieldMappingProfileView from '../../../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const testData = {
        sharedInstanceId: [],
        memberTenant1: Affiliations.College,
        memberTenant2: Affiliations.University,
        marcFile: {
          marc: 'marcBibFileForC405532.mrc',
          fileName: `C405532 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          exportedFileName: `C405532 exportedTestMarcFile${getRandomPostfix()}.mrc`,
          marcFileForModify: 'marcBibFileForC405532_1.mrc',
          modifiedMarcFile: `C405532 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
        },
        contributorName: 'Coates, Ta-Nehisi (C405532)',
        contributorType: 'Producer',
        absentContributorName: 'Stelfreeze, Brian (to be removed)',
        subjects: [
          { row: 0, column: 0, name: 'New Subject C405532' },
          { row: 1, column: 0, name: 'Superfighters (C405532)' },
          { row: 2, column: 0, name: 'Black Panther (Fictitious character) C405532' },
        ],
        instanceTitle: 'C405532 Instance Shared Central',
        tag100: {
          tag: '100',
          content: '$a Coates, Ta-Nehisi (C405532) $e producer',
        },
        tag610: {
          tag: '610',
          content: '$a New Subject C405532',
        },
        tag650: {
          tag: '650',
          content: '$a Superfighters (C405532)"',
        },
        tag700: {
          tag: '700',
        },
      };
      const mappingProfile = {
        name: `C405532 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      };
      const actionProfile = {
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        name: `C405532 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        action: 'UPDATE',
        folioRecordType: 'MARC_BIBLIOGRAPHIC',
      };
      const matchProfile = {
        profileName: `C405532 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      const jobProfileName = `C405532 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

      before('Create test data', () => {
        cy.getAdminToken();
        // cy.loginAsAdmin({
        //   path: TopMenu.dataImportPath,
        //   waiter: DataImport.waitLoading,
        // });
        // DataImport.verifyUploadState();
        // DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
        // JobProfiles.waitFileIsUploaded();
        // JobProfiles.search(testData.marcFile.jobProfileToRun);
        // JobProfiles.runImportFile();
        // JobProfiles.waitFileIsImported(testData.marcFile.fileName);
        // Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        // Logs.openFileDetails(testData.marcFile.fileName);
        // Logs.getCreatedItemsID().then((link) => {
        //   testData.sharedInstanceId.push(link.split('/')[5]);
        // });

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.dataExportEnableApp.gui,
        ])
          .then((userProperties) => {
            testData.user = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.moduleDataImportEnabled.gui,
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.dataExportEnableApp.gui,
            ]);

            // NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile).then(
            //   (mappingProfileResponse) => {
            //     NewActionProfile.createActionProfileViaApiMarc(
            //       actionProfile,
            //       mappingProfileResponse.body.id,
            //     ).then((actionProfileResponse) => {
            //       NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
            //         matchProfile,
            //       ).then((matchProfileResponse) => {
            //         NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            //           jobProfileName,
            //           matchProfileResponse.body.id,
            //           actionProfileResponse.body.id,
            //         );
            //       });
            //     });
            //   },
            // );

            cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.moduleDataImportEnabled.gui,
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.dataExportEnableApp.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.switchActiveAffiliation(tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      // after('Delete test data', () => {
      //   cy.resetTenant();
      //   cy.getAdminToken();
      //   Users.deleteViaApi(testData.user.userId);
      //   InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId[0]);
      //   JobProfiles.deleteJobProfile(jobProfileName);
      //   MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      //   ActionProfiles.deleteActionProfile(actionProfile.name);
      //   FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      //   // delete created files in fixtures
      //   FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      //   FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
      // });

      it(
        'C405532 Adding/deleting fields and subfields when updating shared "MARC Bib" in member tenant (consortia) (folijet)',
        { tags: ['extendedPath', 'folijet'] },
        () => {
          InventoryInstance.searchByTitle(testData.instanceTitle);
          InventorySearchAndFilter.closeInstanceDetailPane();
          InventorySearchAndFilter.selectResultCheckboxes(1);
          InventorySearchAndFilter.verifySelectedRecords(1);
          InventorySearchAndFilter.exportInstanceAsMarc();

          cy.setTenant(Affiliations.College);
          // download exported marc file
          cy.visit(TopMenu.dataExportPath);
          cy.wait(1000);
          ExportFile.getExportedFileNameViaApi().then((name) => {
            testData.marcFile.exportedFileName = name;
            ExportFile.downloadExportedMarcFileViaApi(
              testData.marcFile.exportedFileName,
              testData.user.username,
              testData.user.password,
            );
            // change exported file
            DataImport.replace999SubfieldsInPreupdatedFile(
              testData.marcFile.exportedFileName,
              testData.marcFile.marcFileForModify,
              testData.marcFile.modifiedMarcFile,
            );
          });

          // // upload the exported marc file
          // cy.visit(TopMenu.dataImportPath);
          // // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          // DataImport.verifyUploadState();
          // DataImport.uploadExportedFile(testData.marcFile.modifiedMarcFile);
          // JobProfiles.waitFileIsUploaded();
          // JobProfiles.search(jobProfileName);
          // JobProfiles.runImportFile();
          // JobProfiles.waitFileIsImported(testData.marcFile.modifiedMarcFile);
          // Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

          // ConsortiumManager.switchActiveAffiliation(tenantNames.central);
          // cy.visit(TopMenu.inventoryPath);
          // InventorySearchAndFilter.verifyPanesExist();
          // InventoryInstance.searchByTitle(testData.sharedInstanceId[0]);
          // // InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
          // InventoryInstance.checkContributor(testData.contributorName, testData.contributorType);
          // InventoryInstance.verifyContributorAbsent(testData.absentContributorName);
          // testData.subjects.forEach((subject) => {
          //   InventoryInstance.verifyInstanceSubject(subject.row, subject.column, subject.name);
          // });

          // InventoryInstance.viewSource();
          // InventoryViewSource.contains(`${testData.tag100.tag}\t1  \t${testData.tag100.content}`);
          // InventoryViewSource.contains(`${testData.tag610.tag}\t   \t${testData.tag610.content}`);
          // InventoryViewSource.contains(`${testData.tag650.tag}\t  0\t${testData.tag650.content}`);
          // InventoryViewSource.notContains(`${testData.tag700.tag}\t`);
          // InventoryViewSource.close();
          // InventorySearchAndFilter.switchToBrowseTab();
          // BrowseSubjects.searchBrowseSubjects(testData.subjects[1].name);
          // BrowseSubjects.checkSearchResultRecord(testData.subjects[1].name);
          // BrowseSubjects.searchBrowseSubjects(testData.subjects[0].name);
          // BrowseSubjects.checkSearchResultRecord(testData.subjects[0].name);

          // ConsortiumManager.switchActiveAffiliation(Affiliations.University);
          // cy.visit(TopMenu.inventoryPath);
          // InventorySearchAndFilter.verifyPanesExist();
          // InventoryInstance.searchByTitle(testData.sharedInstanceId[0]);
          // // InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
          // InventoryInstance.checkContributor(testData.contributorName, testData.contributorType);
          // InventoryInstance.verifyContributorAbsent(testData.absentContributorName);
          // testData.subjects.forEach((subject) => {
          //   InventoryInstance.verifyInstanceSubject(subject.row, subject.column, subject.name);
          // });
          // InventoryInstance.viewSource();
          // InventoryViewSource.contains(`${testData.tag100.tag}\t1  \t${testData.tag100.content}`);
          // InventoryViewSource.contains(`${testData.tag610.tag}\t   \t${testData.tag610.content}`);
          // InventoryViewSource.contains(`${testData.tag650.tag}\t  0\t${testData.tag650.content}`);
          // InventoryViewSource.notContains(`${testData.tag700.tag}\t`);
          // InventoryViewSource.close();
          // InventorySearchAndFilter.switchToBrowseTab();
          // BrowseContributors.select();
          // BrowseContributors.browse(testData.contributorName);
          // BrowseContributors.checkSearchResultRecord(testData.contributorName);
          // BrowseContributors.browse(testData.absentContributorName);
          // BrowseContributors.checkMissedMatchSearchResultRecord(testData.absentContributorName);
        },
      );
    });
  });
});
