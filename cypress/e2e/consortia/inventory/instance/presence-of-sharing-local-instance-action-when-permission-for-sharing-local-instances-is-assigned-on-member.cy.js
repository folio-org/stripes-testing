import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;
      const testData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });
        cy.resetTenant();

        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            user.userId,
            [],
            [
              CapabilitySets.uiInventoryInstanceView,
              CapabilitySets.uiConsortiaInventoryLocalSharingInstances,
            ],
          );
          cy.resetTenant();

          cy.login(user.username, user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });

      it(
        'C404512 (CONSORTIA) Verify presence of sharing local instance action when the permission for sharing local instances is assigned on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C404512'] },
        () => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.validateOptionInActionsMenu(
            actionsMenuOptions.shareLocalInstance,
            true,
          );
        },
      );
    });
  });
});
