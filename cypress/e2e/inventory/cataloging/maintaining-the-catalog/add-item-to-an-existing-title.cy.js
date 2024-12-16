import uuid from 'uuid';

import {
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { Locations, ServicePoints } from '../../../../support/fragments/settings/tenant';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Cataloging -> Maintaining the catalog', () => {
    const testData = {
      barcode: uuid(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      instance: {},
      holding: {},
    };

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;

          testData.location = Locations.getDefaultLocation({
            servicePointId: testData.servicePoint.id,
          }).location;

          Locations.createViaApi(testData.location).then((location) => {
            InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
              (holdingSources) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.instance.instanceId,
                  permanentLocationId: location.id,
                  sourceId: holdingSources[0].id,
                }).then((holding) => {
                  testData.holding = holding;
                });
              },
            );
          });
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
        Locations.deleteViaApi(testData.location);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C3493 Add an item to an existing title. There is already a copy at the same library branch. (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C3493'] },
      () => {
        // Find the instance from precondition
        InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);

        // Click on "Add item"
        const ItemRecordEdit = InventoryInstance.clickAddItemByHoldingName({
          holdingName: testData.location.name,
          instanceTitle: testData.instance.instanceTitle,
        });

        // Populate the following fields: "Barcode", "Material type", "Permanent loan type"
        // Click on "Save & Close" button
        ItemRecordEdit.fillItemRecordFields({
          barcode: testData.barcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.location.name,
          records: [{ barcode: testData.barcode, status: ITEM_STATUS_NAMES.AVAILABLE }],
        });
      },
    );
  });
});
