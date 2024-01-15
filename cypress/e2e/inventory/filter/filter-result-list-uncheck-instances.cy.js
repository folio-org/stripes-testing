import { Permissions } from '../../../support/dictionary';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('inventory', () => {
  let userId;
  const testData = {};
  beforeEach('create tests data', () => {
    testData.instanceTitle = `"autoTestInstanceTitle ${getRandomPostfix()}`;
    cy.getAdminToken()
      .then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
        });
      })
      .then((instance) => {
        testData.instanceId = instance.instanceId;
      });

    cy.createTempUser([Permissions.inventoryAll.gui, Permissions.dataExportEnableApp.gui]).then(
      (userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      },
    );
  });

  afterEach('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userId);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
  });

  it(
    'C366530 Verify that User can filter the result list and uncheck instances (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      InventorySearchAndFilter.executeSearch('*');
      InventoryInstances.verifySelectAllInstancesCheckbox();
      InventoryInstances.verifyInstanceResultListIsAbsent(false);
      InventoryInstances.verifyAllCheckboxesAreChecked(false);

      InventoryInstances.clickSelectAllInstancesCheckbox();
      InventoryInstances.verifySelectAllInstancesCheckbox(true);
      InventoryInstances.verifyAllCheckboxesAreChecked(true);
      InventoryInstances.checkSearchResultCount(/\d+ record(s?|) found\d+ record(s?|) selected/);

      InventorySearchAndFilter.executeSearch(testData.instanceTitle);
      InventoryInstances.verifyInstanceResultListIsAbsent(false);
      InventoryInstances.verifyAllCheckboxesAreChecked(true);
      InventoryInstances.checkSearchResultCount(/1 record found100 records selected/);

      InventorySearchAndFilter.selectResultCheckboxes(1);
      InventoryInstances.verifyAllCheckboxesAreChecked(false);
      InventoryInstances.verifySelectAllInstancesCheckbox();
      InventoryInstances.checkSearchResultCount(/1 record found99 records selected/);
      /**
       * workaround is added since the browser's back button behavior is different in real browser and Cypress
       */
      InventorySearchAndFilter.executeSearch('*');
      InventoryInstances.checkSearchResultCount(/\d+ record(s?|) found99 record(s?|) selected/);
      InventoryInstances.verifySelectAllInstancesCheckbox();

      InventorySearchAndFilter.exportInstanceAsMarc();
      cy.visit(TopMenu.dataExportPath);
      DataExportResults.verifyLastItemCount('99');
    },
  );
});
