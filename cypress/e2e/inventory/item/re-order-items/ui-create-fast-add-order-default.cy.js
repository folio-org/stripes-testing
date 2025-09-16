import uuid from 'uuid';
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import FastAddNewRecord from '../../../../support/fragments/inventory/fastAddNewRecord';
import TopMenu from '../../../../support/fragments/topMenu';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitle = `AT_C808498_FolioInstance_${randomPostfix}`;
      const createdItemBarcode = uuid();
      let user;
      let holdingsRecordId;
      let locationName;

      const fastAddRecord = {
        resourceTitle: instanceTitle,
        itemBarcode: createdItemBarcode,
        note: 'AT_C808498 Fast Add Note',
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808498_FolioInstance');

        // Get required reference data - need 2 different locations for multiple holdings
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then((res) => {
          fastAddRecord.permanentLocationOption = `${res.name} (${res.code}) `;
          locationName = res.name;
        });
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          fastAddRecord.resourceType = instanceTypes[0].name;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
          fastAddRecord.permanentLoanType = loanTypes[0].name;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          fastAddRecord.materialType = res.name;
        });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditItems.gui,
          Permissions.inventoryFastAddCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C808498 Create Instance+Holdings+Item with empty "order" field (default state) using "New fast add record" feature (spitfire)',
        {
          tags: ['extendedPath', 'spitfire', 'C808498'],
        },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }, 20_000);
          InventoryInstances.waitContentLoading();

          // Step 1: Create Instance + Holdings + Item using fast add feature
          InventoryActions.openNewFastAddRecordForm();
          FastAddNewRecord.waitLoading();
          FastAddNewRecord.fillFastAddNewRecordForm(fastAddRecord);
          FastAddNewRecord.saveAndClose();
          InventoryInstance.waitLoading();

          // Step 3: Expand Holdings accordion and verify order field
          InventoryInstance.openHoldingsAccordion(`${locationName} >`);

          // Get holdings ID and verify created Item record has order field with "1" value
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${createdItemBarcode}"`,
          }).then((item) => {
            holdingsRecordId = item.holdingsRecordId;

            InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
              expect(items).to.have.length(1);
              expect(items[0].order).to.equal(1);
            });
          });
        },
      );
    });
  });
});
