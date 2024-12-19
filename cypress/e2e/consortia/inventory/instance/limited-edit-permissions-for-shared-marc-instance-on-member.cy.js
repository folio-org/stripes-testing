import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      filePath: 'oneMarcBib.mrc',
      marcFileName: `C402335 autotestFileName${getRandomPostfix()}.mrc`,
      instanceSource: INSTANCE_SOURCE_NAMES.MARC,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.filePath,
        testData.marcFileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
      });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            Permissions.uiInventoryViewCreateEditInstances.gui,
          ]);

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C402335 (CONSORTIA) Verify limited Edit permissions for Shared MARC instance on Member tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C402335'] },
      () => {
        cy.intercept('POST', '/authn/refresh').as('/authn/refresh');
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.bySource(testData.instanceSource);
        cy.wait(1500);
        InventorySearchAndFilter.byShared('Yes');
        cy.wait(1500);
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
        cy.wait('@/authn/refresh', { timeout: 5000 });
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InstanceRecordView.verifyInstanceSource(testData.instanceSource);
        InstanceRecordView.verifyEditInstanceButtonAbsent();
      },
    );
  });
});
