import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      accordion: 'Suppress from discovery',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;

        cy.getInstanceById(testData.instance.instanceId).then((body) => {
          body.discoverySuppress = true;
          cy.updateInstance(body);
        });
      });

      cy.createTempUser([Permissions.enableStaffSuppressFacet.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });
    });

    it(
      'C432313 Check "Inventory: Enable staff suppress facet" permission in Inventory app (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        InventorySearchAndFilter.expandAccordion(testData.accordion);
        InventorySearchAndFilter.verifyCheckboxInAccordion(testData.accordion, 'No', false);
        InventorySearchAndFilter.verifyCheckboxInAccordion(testData.accordion, 'Yes', false);
      },
    );
  });
});
