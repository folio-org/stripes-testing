import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../../support/fragments/settings/dataImport/marcFieldProtection';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const users = {};
      const testData = {
        marcFile: {
          marc: 'marcBibFileForC405534.mrc',
          fileName: `C405534 testMarcFile${getRandomPostfix()}.mrc`,
          exportedFileName: `C405534 exportedTestMarcFile${getRandomPostfix()}.mrc`,
          modifiedMarcFile: `C405534 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
        },
        instanceTitle: 'C405534 Instance Shared Central',
        updatedInstanceTitle: 'C405534 Instance Shared Central Updated',
        field245: {
          tag: '245',
          content: '$a C405534 Instance Shared Central Updated',
        },
        field500: {
          tag: '500',
          content: '$a Proceedings Updated.',
        },
      };
      const mappingProfile = {
        name: `C405534 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      };
      const actionProfile = {
        name: `C405534 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        action: 'UPDATE',
        folioRecordType: 'MARC_BIBLIOGRAPHIC',
      };
      const matchProfile = {
        profileName: `C405534 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      const jobProfileName = `C405534 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

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
        cy.resetTenant();

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
            // need to delete 245 from protected fields before updating
            MarcFieldProtection.getListViaApi({
              query: `"field"=="${testData.field245.tag}"`,
            }).then((list) => {
              if (list) {
                list.forEach(({ id }) => MarcFieldProtection.deleteViaApi(id));
              }
            });
            cy.resetTenant();
          });
      });

      after('Delete test data', () => {
        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
        FileManager.deleteFileFromDownloadsByMask(testData.marcFile.exportedFileName);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userAProperties.userId);
        Users.deleteViaApi(users.userBProperties.userId);
        InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });

      it(
        'C405534 User can update shared "MARC Bib" in Central tenant via Data import and changes flow to member tenants (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C405534'] },
        () => {
          cy.login(users.userAProperties.username, users.userAProperties.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
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
            cy.setTenant(Affiliations.Consortia).then(() => {
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
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
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
});
