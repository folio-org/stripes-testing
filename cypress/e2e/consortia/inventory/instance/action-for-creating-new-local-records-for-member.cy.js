import { APPLICATION_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;
      let instanceHRID;
      const testData = {
        instanceTitle: `C405563 autoTestInstanceTitle${getRandomPostfix()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewCreateEditInstances.gui,
            ]);
            cy.resetTenant();

            cy.login(user.username, user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          },
        );
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.setTenant(Affiliations.College).then(() => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });

      const verifySearchAndFilterPane = () => {
        InventorySearchAndFilter.verifyPanesExist();
        InventorySearchAndFilter.verifySearchToggleButtonSelected();
        InventorySearchAndFilter.instanceTabIsDefault();
      };

      it(
        'C405563 (CONSORTIA) (CONSORTIA) Verify the action for creating new local records for Member tenant (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C405563'] },
        () => {
          verifySearchAndFilterPane();
          const InventoryNewInstance = InventoryInstances.addNewInventory();
          InventoryNewInstance.fillRequiredValues(testData.instanceTitle);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.checkInstanceDetails({
            instanceInformation: [{ key: 'Source', value: INSTANCE_SOURCE_NAMES.FOLIO }],
          });
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHRID = initialInstanceHrId;
          });
        },
      );
    });
  });
});
