import {
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../../support/fragments/settings/dataImport';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
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
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      sharedInstanceId: [],
      marcFile: {
        marc: 'marcBibFileForC405531.mrc',
        fileName: `C405531 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        exportedFileName: `C405531 exportedTestMarcFile${getRandomPostfix()}.mrc`,
        marcFileForModify: 'marcBibFileForC405531_1.mrc',
        modifiedMarcFile: `C405531 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
      },
      contributorName: 'Coates, Ta-Nehisi (C405531)',
      contributorType: 'Translator',
      absentContributorName: 'Stelfreeze, Brian (to be deleted)',
      subjects: [
        { row: 0, column: 0, name: 'Black Panther (Fictitious character) C405531' },
        { row: 1, column: 0, name: 'New Subject C405531' },
        { row: 2, column: 0, name: 'Superfighters (C405531)' },
      ],
      instanceTitle: 'C405531 Instance Shared Central',
      tag100: {
        tag: '100',
        content: '$a Coates, Ta-Nehisi (C405531) $e translator',
      },
      tag610: {
        tag: '610',
        content: '$a New Subject C405531',
      },
      tag650: {
        tag: '650',
        content: '$a Superfighters (C405531)',
      },
      tag700: {
        tag: '700',
      },
    };
    const mappingProfile = {
      name: `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
    const jobProfileName = `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken();
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
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(testData.marcFile.marc, testData.marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(testData.marcFile.jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(
        testData.marcFile.fileName.substring(0, testData.marcFile.fileName.length - 4) + '_1.mrc',
      );
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(
        testData.marcFile.fileName.substring(0, testData.marcFile.fileName.length - 4) + '_1.mrc',
      );
      Logs.getCreatedItemsID().then((link) => {
        testData.sharedInstanceId.push(link.split('/')[5]);
      });

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
          // cy.assignPermissionsToExistingUser(testData.user.userId, [
          //   Permissions.moduleDataImportEnabled.gui,
          //   Permissions.inventoryAll.gui,
          //   Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          //   Permissions.dataExportEnableApp.gui,
          // ]);

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.resetTenant();
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId[0]);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
    });

    it(
      'C405531 Check adding/deleting fields and subfields when updating shared "MARC Bib" in Central tenant via Data import and confirm in member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.sharedInstanceId[0]);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.verifySelectedRecords(1);
        InventorySearchAndFilter.exportInstanceAsMarc();
        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        cy.wait(1000);
        ExportFile.getExportedFileNameViaApi().then((name) => {
          testData.marcFile.exportedFileName = name;
          ExportFile.downloadExportedMarcFile(testData.marcFile.exportedFileName);
          // change exported file
          DataImport.replace999SubfieldsInPreupdatedFile(
            testData.marcFile.exportedFileName,
            testData.marcFile.marcFileForModify,
            testData.marcFile.modifiedMarcFile,
          );
        });
        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(testData.marcFile.modifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.marcFile.modifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFile.modifiedMarcFile);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.verifyPanesExist();
        InventoryInstances.searchByTitle(testData.sharedInstanceId[0]);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.checkContributor(testData.contributorName);
        InventoryInstance.verifyContributorAbsent(testData.absentContributorName);
        testData.subjects.forEach((subject) => {
          InventoryInstance.verifyInstanceSubject(subject.row, subject.column, subject.name);
        });
        InventoryInstance.viewSource();
        InventoryViewSource.contains(`${testData.tag100.tag}\t1  \t${testData.tag100.content}`);
        InventoryViewSource.contains(`${testData.tag610.tag}\t   \t${testData.tag610.content}`);
        InventoryViewSource.contains(`${testData.tag650.tag}\t  0\t${testData.tag650.content}`);
        InventoryViewSource.notContains(`${testData.tag700.tag}\t`);
        InventoryViewSource.close();
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.searchBrowseSubjects(testData.subjects[2].name);
        BrowseSubjects.checkSearchResultRecord(testData.subjects[2].name);
        BrowseSubjects.searchBrowseSubjects(testData.subjects[1].name);
        BrowseSubjects.checkSearchResultRecord(testData.subjects[1].name);

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.sharedInstanceId[0]);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.checkContributor(testData.contributorName);
        InventoryInstance.verifyContributorAbsent(testData.absentContributorName);
        testData.subjects.forEach((subject) => {
          InventoryInstance.verifyInstanceSubject(subject.row, subject.column, subject.name);
        });
        InventoryInstance.viewSource();
        InventoryViewSource.contains(`${testData.tag100.tag}\t1  \t${testData.tag100.content}`);
        InventoryViewSource.contains(`${testData.tag610.tag}\t   \t${testData.tag610.content}`);
        InventoryViewSource.contains(`${testData.tag650.tag}\t  0\t${testData.tag650.content}`);
        InventoryViewSource.notContains(`${testData.tag700.tag}\t`);
        InventoryViewSource.close();

        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkContentByTag(testData.tag100.tag, `${testData.tag100.content}`);
        QuickMarcEditor.checkContentByTag(testData.tag610.tag, `${testData.tag610.content}`);
        QuickMarcEditor.checkContentByTag(testData.tag650.tag, `${testData.tag650.content}`);
        QuickMarcEditor.checkTagAbsent(testData.tag700.tag);
        QuickMarcEditor.closeEditorPane();

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseContributors.select();
        BrowseContributors.browse(testData.contributorName);
        BrowseContributors.checkSearchResultRecord(testData.contributorName);
        BrowseContributors.browse(testData.absentContributorName);
        BrowseContributors.checkMissedMatchSearchResultRecord(testData.absentContributorName);
      },
    );
  });
});
