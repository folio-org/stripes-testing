import { matching } from '@interactors/html';
import { LOAN_TYPE_NAMES, LOCATION_NAMES, MATERIAL_TYPE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      permanentLocation: LOCATION_NAMES.ANNEX,
      permanentLocationUI: LOCATION_NAMES.ANNEX_UI,
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
      calloutMessage: '^The item - HRID.* has been successfully saved.$',
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${testData.permanentLocationUI}"` }).then((locations) => {
            testData.locationsId = locations.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [],
          }).then((specialInstanceIds) => {
            testData.testInstanceIds = specialInstanceIds;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.testInstanceIds.instanceId,
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C411681 (NON-CONSORTIA) Verify the closing after Add item action on Non-consortia tenant (folijet)',
      { tags: ['extendedPath', 'folijet', 'C411681'] },
      () => {
        InventoryInstances.searchByTitle(testData.testInstanceIds.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.addItem();
        ItemRecordNew.addMaterialType(testData.materialType);
        ItemRecordNew.addPermanentLoanType(testData.permanentLoanType);
        ItemRecordNew.save();
        InteractorsTools.checkCalloutMessage(matching(new RegExp(testData.calloutMessage)));
        InstanceRecordView.verifyInstanceRecordViewOpened();
      },
    );
  });
});
