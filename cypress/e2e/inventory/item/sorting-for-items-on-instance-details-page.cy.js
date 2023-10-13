import uuid from 'uuid';
import moment from 'moment';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import UserEdit from '../../../support/fragments/users/userEdit';
import ConfirmItemInModal from '../../../support/fragments/check-in-actions/confirmItemInModal';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import Users from '../../../support/fragments/users/users';
import FilterItems from '../../../support/fragments/inventory/filterItems';
import SwitchServicePoint from '../../../support/fragments/settings/tenant/servicePoints/switchServicePoint';

describe('inventory', () => {
  describe('Item', () => {
    let user;
    const itemData = {
      barcode: uuid(),
      instanceTitle: `autotestInstance ${getRandomPostfix()}`,
    };
    const holdingsPermanentLocation = LOCATION_NAMES.ONLINE_UI;
    const testData = [ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode];

    before('create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            itemData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            itemData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${holdingsPermanentLocation}"` }).then((locations) => {
            testData.locationsId = locations.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            itemData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            itemData.materialTypeId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: itemData.instanceTypeId,
              title: itemData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: itemData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [
              {
                barcode: itemData.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: itemData.loanTypeId },
                materialType: { id: itemData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            itemData.testInstanceIds = specialInstanceIds;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    it(
      'C409420 Verify the sorting for Items on Instance details page (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {},
    );
  });
});
