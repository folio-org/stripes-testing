import {
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../support/constants';
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
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      marcFile: {
        marc: 'marcBibFileForC411794.mrc',
        fileName: `C411794 testMarcFile${getRandomPostfix()}.mrc`,
        exportedFileName: `C411794 exportedTestMarcFile${getRandomPostfix()}.mrc`,
        marcFileForModify: 'marcBibFileForC411794_1.mrc',
        modifiedMarcFile: `C411794 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
      },
      contributorName: 'Coates, Ta-Nehisi (C411794)',
      contributorType: 'Producer',
      absentContributorName: 'Stelfreeze, Brian (to be removed)',
      subjects: [
        { row: 0, column: 0, name: 'Black Panther (Fictitious character) C411794' },
        { row: 1, column: 0, name: 'New Subject C411794' },
        { row: 2, column: 0, name: 'Superfighters (C411794)' },
      ],
      instanceTitle: 'C411794 Instance Shared Central',
      tag100: {
        tag: '100',
        content: '$a Coates, Ta-Nehisi (C411794) $e producer',
      },
      tag610: {
        tag: '610',
        content: '$a New Subject C411794',
      },
      tag650: {
        tag: '650',
        content: '$a Superfighters (C411794) ',
      },
      tag700: {
        tag: '700',
      },
    };
    const mappingProfile = {
      name: `C411794 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C411794 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C411794 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
    const jobProfileName = `C411794 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.sharedInstanceId = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.dataExportEnableApp.gui,
        ]);
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

        const collegeLocationData = Locations.getDefaultLocation({
          servicePointId: ServicePoints.getDefaultServicePoint().id,
        }).location;
        Locations.createViaApi(collegeLocationData).then((location) => {
          testData.collegeLocation = location;
          // adding Holdings for shared Instance
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: testData.sharedInstanceId,
            permanentLocationId: testData.collegeLocation.id,
          }).then((holding) => {
            testData.holding = holding;
          });
        });
        cy.resetTenant();

        cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
        cy.setTenant(Affiliations.University);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.dataExportEnableApp.gui,
        ]);
        cy.resetTenant();

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId);
      cy.setTenant(Affiliations.College);
      InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
      Locations.deleteViaApi(testData.collegeLocation);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
    });

    it(
      'C411794 Adding/deleting fields and subfields when updating Shadow "MARC Bib" in member tenant via Data Import (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.sharedInstanceId);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.verifySelectedRecords(1);
        InventorySearchAndFilter.exportInstanceAsMarc();

        cy.setTenant(Affiliations.College).then(() => {
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
        });
        cy.resetTenant();

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(testData.marcFile.modifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.marcFile.modifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.sharedInstanceId);
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

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.sharedInstanceId);
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
      },
    );
  });
});
