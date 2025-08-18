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
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
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
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
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
        {
          row: 0,
          name: 'Black Panther (Fictitious character) C411794',
          source: 'Library of Congress Subject Headings',
          type: 'Personal name',
        },
        { row: 1, name: 'New Subject C411794', source: 'No value set-', type: 'Corporate name' },
        {
          row: 2,
          name: 'Superfighters (C411794)',
          source: 'Library of Congress Subject Headings',
          type: 'Topical term',
        },
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
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfileName = `C411794 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

    before('Create test data and login', () => {
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
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          Permissions.consortiaCentralAll.gui,
        ]);
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
        // adding Holdings for shared Instance
        const collegeLocationData = Locations.getDefaultLocation({
          servicePointId: ServicePoints.getDefaultServicePoint().id,
        }).location;
        Locations.createViaApi(collegeLocationData).then((location) => {
          testData.collegeLocation = location;
          InventoryHoldings.getHoldingSources({ query: '(name=="MARC")' }).then(
            (holdingSources) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.sharedInstanceId,
                permanentLocationId: testData.collegeLocation.id,
                sourceId: holdingSources[0].id,
              }).then((holding) => {
                testData.holding = holding;
              });
            },
          );
        });
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

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId[0]);
      cy.setTenant(Affiliations.College);
      InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
      Locations.deleteViaApi(testData.collegeLocation);
      InventoryInstance.deleteInstanceViaApi(testData.instanceIdOnMemberTenant);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C411794 Adding/deleting fields and subfields when updating Shadow "MARC Bib" in member tenant via Data Import (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C411794'] },
      () => {
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.sharedInstanceId);
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
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.sharedInstanceId);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.checkContributor(testData.contributorName);
        InventoryInstance.verifyContributorAbsent(testData.absentContributorName);
        testData.subjects.forEach((subject) => {
          InstanceRecordView.verifyInstanceSubject({
            indexRow: subject.row,
            subjectHeadings: subject.name,
            subjectSource: subject.source,
            subjectType: subject.type,
          });
        });
        InstanceRecordView.viewSource();
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
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.sharedInstanceId);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.checkContributor(testData.contributorName);
        InventoryInstance.verifyContributorAbsent(testData.absentContributorName);
        testData.subjects.forEach((subject) => {
          InstanceRecordView.verifyInstanceSubject({
            indexRow: subject.row,
            subjectHeadings: subject.name,
            subjectSource: subject.source,
            subjectType: subject.type,
          });
        });
        InstanceRecordView.viewSource();
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
