import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
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
          cy.resetTenant();
          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFiles.shared.marc,
            marcFiles.shared.fileNameImported,
            marcFiles.shared.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdInstanceIds.shared.push(record.instance.id);
            });
          });

          cy.setTenant(Affiliations.College);
          DataImport.uploadFileViaApi(
            marcFiles.local.marc,
            marcFiles.local.fileNameImported,
            marcFiles.local.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdInstanceIds.local.push(record.instance.id);
            });
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }, 20_000).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            InventoryInstances.waitContentLoading();
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
        { tags: ['criticalPathECS', 'spitfire', 'C410714'] },
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
