import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const instancePrefix = 'C410417Auto';
      const testData = {
        sharedInstance: {
          title: `${instancePrefix} Shared FOLIO`,
        },
        localInstance: {
          title: `${instancePrefix} Local FOLIO`,
        },
        sharedMarcTitle: 'C410417Auto Shared MARC',
        localMarcTitle: 'C410417Auto Local MARC',
      };

      const createdInstanceIds = {
        shared: [],
        local: [],
      };

      const marcFiles = {
        shared: {
          marc: 'marcBibFileC410714shared.mrc',
          fileNameImported: `testMarcFileC410714shared.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        local: {
          marc: 'marcBibFileC410714local.mrc',
          fileNameImported: `testMarcFileC410714local.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
      };

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          testData.userProperties = userProperties;

          InventoryInstance.createInstanceViaApi({
            instanceTitle: testData.sharedInstance.title,
          }).then((instanceData) => {
            createdInstanceIds.shared.push(instanceData.instanceData.instanceId);
          });

          cy.setTenant(Affiliations.College);

          InventoryInstance.createInstanceViaApi({
            instanceTitle: testData.localInstance.title,
          }).then((instanceData) => {
            createdInstanceIds.local.push(instanceData.instanceData.instanceId);
          });

          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              DataImport.verifyUploadState();
              DataImport.uploadFileAndRetry(
                marcFiles.shared.marc,
                marcFiles.shared.fileNameImported,
              );
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFiles.shared.jobProfileToRun);
              JobProfiles.runImportFile();
              JobProfiles.waitFileIsImported(marcFiles.shared.fileNameImported);
              Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
              Logs.openFileDetails(marcFiles.shared.fileNameImported);
              Logs.getCreatedItemsID().then((link) => {
                createdInstanceIds.shared.push(link.split('/')[5]);
              });

              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

              DataImport.verifyUploadState();
              DataImport.uploadFileAndRetry(marcFiles.local.marc, marcFiles.local.fileNameImported);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFiles.local.jobProfileToRun);
              JobProfiles.runImportFile();
              JobProfiles.waitFileIsImported(marcFiles.local.fileNameImported);
              Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
              Logs.openFileDetails(marcFiles.local.fileNameImported);
              Logs.getCreatedItemsID().then((link) => {
                createdInstanceIds.local.push(link.split('/')[5]);
              });
            },
          );

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdInstanceIds.shared.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        cy.setTenant(Affiliations.College);
        createdInstanceIds.local.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C410714 "Shared" records will be found from "Instance/Holdings/Item" tabs of "Inventory" app on Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'eurekaPhase1'] },
        () => {
          InventoryInstances.searchByTitle(instancePrefix);
          InventorySearchAndFilter.verifySearchResult(testData.sharedInstance.title);
          InventorySearchAndFilter.verifySearchResult(testData.sharedMarcTitle);
          InventorySearchAndFilter.verifySearchResult(testData.localInstance.title, false);
          InventorySearchAndFilter.verifySearchResult(testData.localMarcTitle, false);

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.checkSearchQueryText('');
          InventoryInstances.searchByTitle(instancePrefix);
          InventorySearchAndFilter.verifySearchResult(testData.sharedInstance.title);
          InventorySearchAndFilter.verifySearchResult(testData.sharedMarcTitle);
          InventorySearchAndFilter.verifySearchResult(testData.localInstance.title, false);
          InventorySearchAndFilter.verifySearchResult(testData.localMarcTitle, false);

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.checkSearchQueryText('');
          InventoryInstances.searchByTitle(instancePrefix);
          InventorySearchAndFilter.verifySearchResult(testData.sharedInstance.title);
          InventorySearchAndFilter.verifySearchResult(testData.sharedMarcTitle);
          InventorySearchAndFilter.verifySearchResult(testData.localInstance.title, false);
          InventorySearchAndFilter.verifySearchResult(testData.localMarcTitle, false);
        },
      );
    });
  });
});
