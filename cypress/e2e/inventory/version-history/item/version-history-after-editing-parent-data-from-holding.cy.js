import {
  APPLICATION_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import Users from '../../../../support/fragments/users/users';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Item', () => {
      const testData = {
        itemBarcode: getRandomPostfix(),
        callNumber: `${randomFourDigitNumber()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C656254 Check "Version history" after editing parent data from holding (folijet)',
        { tags: ['criticalPath', 'folijet', 'C656254'] },
        () => {
          InventoryInstance.pressAddHoldingsButton();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.fillHoldingFields({
            permanentLocation: LOCATION_NAMES.ANNEX,
          });
          HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
          InventoryInstance.openHoldingView();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.firstName,
            testData.lastName,
            true,
          );
          HoldingsRecordView.close();
          InventoryInstance.waitInstanceRecordViewOpened();

          InventoryInstance.addItem();
          ItemRecordNew.fillItemRecordFields({
            barcode: testData.itemBarcode,
            materialType: MATERIAL_TYPE_NAMES.BOOK,
            loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          });
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.ANNEX_UI);
          InventoryInstance.checkIsItemCreated(testData.itemBarcode);

          InventoryInstance.openItemByBarcode(testData.itemBarcode);
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.firstName,
            testData.lastName,
            true,
          );
          VersionHistorySection.clickCloseButton();
          ItemRecordView.closeDetailView();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.fillCallNumber(testData.callNumber);
          HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Call number (Added)'],
          });
          HoldingsRecordView.close();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.ANNEX_UI);
          InventoryInstance.checkIsItemCreated(testData.itemBarcode);

          InventoryInstance.openItemByBarcode(testData.itemBarcode);
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Effective call number (Added)'],
          });
        },
      );
    });
  });
});
