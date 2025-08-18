import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      marcFile: {
        marc: 'marcBibFileForC405532.mrc',
        fileName: `C405532 testMarcFile${getRandomPostfix()}.mrc`,
        exportedFileName: `C405532 exportedTestMarcFile${getRandomPostfix()}.mrc`,
        marcFileForModify: 'marcBibFileForC405532_1.mrc',
        modifiedMarcFile: `C405532 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
      },
      contributorName: 'Coates, Ta-Nehisi (C405532)',
      contributorType: 'Producer',
      absentContributorName: 'C405532Stelfreeze, Brian (to be removed)',
      subjects: [
        {
          row: 0,
          name: 'Black Panther (Fictitious character) C405532',
          source: 'Library of Congress Subject Headings',
          type: 'Personal name',
        },
        { row: 1, name: 'New Subject C405532', source: 'No value set-', type: 'Corporate name' },
        {
          row: 2,
          name: 'Superfighters (C405532)',
          source: 'Library of Congress Subject Headings',
          type: 'Topical term',
        },
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
        content: '$a Superfighters (C405532) ',
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
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfileName = `C405532 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
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
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            Permissions.consortiaCentralAll.gui,
          ]);

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]);
          cy.resetTenant();
        })
        .then(() => {
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
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C405532 Adding/deleting fields and subfields when updating shared "MARC Bib" in member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C405532'] },
      () => {
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.instanceId);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.verifySelectedRecords(1);
        InventorySearchAndFilter.exportInstanceAsMarc();
        cy.intercept('/data-export/quick-export').as('getHrid');
        cy.wait('@getHrid', getLongDelay()).then((req) => {
          const expectedRecordHrid = req.response.body.jobExecutionHrId;

          // download exported marc file
          cy.setTenant(Affiliations.College).then(() => {
            // use cy.getToken function to get toket for current tenant
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            ExportFile.downloadExportedMarcFileWithRecordHrid(
              expectedRecordHrid,
              testData.marcFile.exportedFileName,
            );
            FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
          });
        });
        // change exported file
        DataImport.replace999SubfieldsInPreupdatedFile(
          testData.marcFile.exportedFileName,
          testData.marcFile.marcFileForModify,
          testData.marcFile.modifiedMarcFile,
        );

        // upload the exported marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(testData.marcFile.modifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImportedForConsortia(testData.marcFile.modifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.verifyPanesExist();
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.checkContributor(testData.contributorName, testData.contributorType);
        InventoryInstance.verifyContributorAbsent(testData.absentContributorName);
        testData.subjects.forEach((subject) => {
          InstanceRecordView.verifyInstanceSubject({
            indexRow: subject.row,
            subjectHeadings: subject.name,
            subjectSource: subject.source,
            subjectType: subject.type,
          });
        });

        InventoryInstance.viewSource();
        InventoryViewSource.contains(`${testData.tag100.tag}\t1  \t${testData.tag100.content}`);
        InventoryViewSource.contains(`${testData.tag610.tag}\t   \t${testData.tag610.content}`);
        InventoryViewSource.contains(`${testData.tag650.tag}\t  0\t${testData.tag650.content}`);
        InventoryViewSource.notContains(`${testData.tag700.tag}\t`);
        InventoryViewSource.close();
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.searchBrowseSubjects(testData.subjects[1].name);
        BrowseSubjects.checkSearchResultRecord(testData.subjects[1].name);
        BrowseSubjects.searchBrowseSubjects(testData.subjects[0].name);
        BrowseSubjects.checkSearchResultRecord(testData.subjects[0].name);

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.verifyPanesExist();
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.checkContributor(testData.contributorName, testData.contributorType);
        InventoryInstance.verifyContributorAbsent(testData.absentContributorName);
        testData.subjects.forEach((subject) => {
          InstanceRecordView.verifyInstanceSubject({
            indexRow: subject.row,
            subjectHeadings: subject.name,
            subjectSource: subject.source,
            subjectType: subject.type,
          });
        });
        InventoryInstance.viewSource();
        InventoryViewSource.contains(`${testData.tag100.tag}\t1  \t${testData.tag100.content}`);
        InventoryViewSource.contains(`${testData.tag610.tag}\t   \t${testData.tag610.content}`);
        InventoryViewSource.contains(`${testData.tag650.tag}\t  0\t${testData.tag650.content}`);
        InventoryViewSource.notContains(`${testData.tag700.tag}\t`);
        InventoryViewSource.close();
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
