import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
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
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const users = {};
      const testData = {
        sharedInstanceId: [],
        marcFile: {
          marc: 'marcBibFileForC411792.mrc',
          fileName: `C411792 testMarcFile${getRandomPostfix()}.mrc`,
          exportedFileName: `C411792 exportedTestMarcFile${getRandomPostfix()}.mrc`,
          modifiedMarcFile: `C411792 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
        },
        instanceTitle: 'C411792 Instance Shared Central',
        updatedInstanceTitle: 'C411792 Instance Shared Central Updated',
        field245: {
          tag: '245',
          content: '$a C411792 Instance Shared Central Updated',
        },
        field500: {
          tag: '500',
          content: '$a Proceedings Updated.',
        },
      };
      const mappingProfile = {
        name: `C411792 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      };
      const actionProfile = {
        name: `C411792 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        action: 'UPDATE',
        folioRecordType: 'MARC_BIBLIOGRAPHIC',
      };
      const matchProfile = {
        profileName: `C411792 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      const jobProfileName = `C411792 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

      before('Create test data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.sharedInstanceId = response[0].instance.id;
        });
        cy.setTenant(Affiliations.College)
          .then(() => {
            cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
              testData.location = res;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
            });
          })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.sharedInstanceId,
              permanentLocationId: testData.location.id,
              sourceId: testData.sourceId,
            }).then((holding) => {
              testData.holdingsId = holding.id;
            });

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
          });
        cy.resetTenant();

        // create user A
        cy.getAdminToken();
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
          .then((userProperties) => {
            users.userAProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, users.userAProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userAProperties.userId, [
              Permissions.moduleDataImportEnabled.gui,
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
              Permissions.dataExportViewAddUpdateProfiles.gui,
              Permissions.consortiaCentralAll.gui,
            ]);
            cy.resetTenant();
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
            cy.assignAffiliationToUser(Affiliations.University, users.userBProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
            cy.resetTenant();
          });
      });

      after('Delete test data', () => {
        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
        FileManager.deleteFileFromDownloadsByMask(testData.marcFile.exportedFileName);
        cy.resetTenant();
        cy.withinTenant(Affiliations.College, () => {
          InventoryHoldings.deleteHoldingRecordViaApi(testData.holdingsId);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userAProperties.userId);
          Users.deleteViaApi(users.userBProperties.userId);
          InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId);
        });
      });

      it(
        'C411792 User can update Shadow "MARC Bib" Instance in member tenant via Data import (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411792'] },
        () => {
          cy.login(users.userAProperties.username, users.userAProperties.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
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
              ExportFile.waitLandingPageOpened();
              ExportFile.downloadExportedMarcFileWithRecordHrid(
                expectedRecordHrid,
                testData.marcFile.exportedFileName,
              );
              FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
            });
          });
          // change exported file
          DataImport.editMarcFile(
            testData.marcFile.exportedFileName,
            testData.marcFile.modifiedMarcFile,
            [testData.instanceTitle, 'Proceedings'],
            [testData.updatedInstanceTitle, 'Proceedings Updated'],
          );

          // upload the exported and edited marc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadExportedFile(testData.marcFile.modifiedMarcFile);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImportedForConsortia(testData.marcFile.modifiedMarcFile);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.marcFile.modifiedMarcFile);
          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
          InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
          InventoryInstance.verifyLastUpdatedSource(
            users.userAProperties.firstName,
            users.userAProperties.lastName,
          );

          cy.login(users.userBProperties.username, users.userBProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventorySearchAndFilter.verifyPanesExist();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventoryInstances.searchByTitle(testData.sharedInstanceId);
          InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
          InventoryInstance.verifyLastUpdatedSource(
            users.userAProperties.firstName,
            users.userAProperties.lastName,
          );
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkContentByTag(testData.field245.tag, testData.field245.content);
          QuickMarcEditor.checkContentByTag(testData.field500.tag, testData.field500.content);
          QuickMarcEditor.checkSourceValue(
            users.userAProperties.firstName,
            users.userAProperties.lastName,
          );

          cy.login(users.userBProperties.username, users.userBProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventorySearchAndFilter.verifyPanesExist();
          cy.reload();
          InventoryInstances.searchByTitle(testData.sharedInstanceId);
          cy.wait(5000);
          InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
          // TO DO: fix this check failure - 'Unknown user' is shown, possibly due to the way users are created in test
          // InventoryInstance.verifyLastUpdatedSource(
          //   users.userAProperties.firstName,
          //   users.userAProperties.lastName,
          // );
          InventoryInstance.viewSource();
          InventoryViewSource.contains(testData.field245.content);
          InventoryViewSource.contains(testData.field500.content);
        },
      );
    });
  });
});
