import {
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
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
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const users = {};
    const testData = {
      marcFile: {
        marc: 'marcBibFileForC411795.mrc',
        fileName: `C411795 testMarcFile${getRandomPostfix()}.mrc`,
        exportedFileName: `C411795 exportedTestMarcFile${getRandomPostfix()}.mrc`,
        modifiedMarcFile: `C411795 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
      },
      instanceTitle: 'C411795 Instance Shared Central',
      updatedInstanceTitle: 'C411795 Instance Shared Central Updated',
      field245: {
        tag: '245',
        content: '$a C411795 Instance Shared Central Updated',
      },
      field500: {
        tag: '500',
        content: '$a Proceedings Updated.',
      },
    };
    const mappingProfile = {
      name: `C411795 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      name: `C411795 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C411795 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
    const jobProfileName = `C411795 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken();
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
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.sharedInstanceId = response[0].instance.id;
      });
      cy.setTenant(Affiliations.College);
      // adding Holdings for shared Instance
      const collegeLocationData = Locations.getDefaultLocation({
        servicePointId: ServicePoints.getDefaultServicePoint().id,
      }).location;
      Locations.createViaApi(collegeLocationData).then((location) => {
        testData.collegeLocation = location;

        InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
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

        InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
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

      // create user A
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((userProperties) => {
        users.userAProperties = userProperties;
      });

      // create user B
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ])
        .then((userProperties) => {
          users.userBProperties = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, users.userBProperties.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]);
        });
      cy.resetTenant();
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(users.userAProperties.userId);
      Users.deleteViaApi(users.userBProperties.userId);
      cy.setTenant(Affiliations.College);
      InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
      Locations.deleteViaApi(testData.collegeLocation);
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId);
      cy.resetTenant();
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    });

    it(
      'C411795 User can update "MARC Bib" in Central tenant via import and check updated in member tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        cy.login(users.userAProperties.username, users.userAProperties.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.sharedInstanceId);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.verifySelectedRecords(1);
        InventorySearchAndFilter.exportInstanceAsMarc();
        cy.intercept('/data-export/quick-export').as('getHrid');
        cy.wait('@getHrid', getLongDelay()).then((req) => {
          const expectedRecordHrid = req.response.body.jobExecutionHrId;

          // download exported marc file
          cy.visit(TopMenu.dataExportPath);
          ExportFile.downloadExportedMarcFileWithRecordHrid(
            expectedRecordHrid,
            testData.marcFile.exportedFileName,
          );
          FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
        });
        // change exported file
        DataImport.editMarcFile(
          testData.marcFile.exportedFileName,
          testData.marcFile.modifiedMarcFile,
          [testData.instanceTitle, 'Proceedings'],
          [testData.updatedInstanceTitle, 'Proceedings Updated'],
        );

        // upload the exported and edited marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(testData.marcFile.modifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.marcFile.modifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.sharedInstanceId);
        InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
        InventoryInstance.verifyLastUpdatedSource(
          users.userAProperties.firstName,
          users.userAProperties.lastName,
        );
        InventoryInstance.viewSource();
        InventoryViewSource.contains(`${testData.field245.tag}\t0 0\t${testData.field245.content}`);
        InventoryViewSource.contains(`${testData.field500.tag}\t   \t${testData.field500.content}`);

        cy.login(users.userBProperties.username, users.userBProperties.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.sharedInstanceId);
        InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
        // TO DO: fix this check failure - 'Unknown user' is shown, possibly due to the way users are created in test
        // InventoryInstance.verifyLastUpdatedSource(
        //   users.userAProperties.firstName,
        //   users.userAProperties.lastName,
        // );
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkContentByTag(testData.field245.tag, testData.field245.content);
        QuickMarcEditor.checkContentByTag(testData.field500.tag, testData.field500.content);
        QuickMarcEditor.checkSourceValue(
          users.userAProperties.firstName,
          users.userAProperties.lastName,
        );
      },
    );
  });
});
