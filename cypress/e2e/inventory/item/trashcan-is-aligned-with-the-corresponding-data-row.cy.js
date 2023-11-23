import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';

const testData = {
  user: {},
  item: {
    instanceName: `Inventory Instance ${randomFourDigitNumber()}`,
    itemBarcode: randomFourDigitNumber(),
  },
  statisticalCode: 'Book, print (books)',
  secondStatisticalCode: 'Books, electronic (ebooks)',
  calloutMessage: 'has been successfully saved.',
};

describe('inventory', () => {
  describe('Item', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.createInstanceViaApi(
        testData.item.instanceName,
        testData.item.itemBarcode,
      );
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          testData.item.itemBarcode,
        );
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C380748 Item Create screen: trashcan is aligned with the corresponding data row (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        InventoryInstance.searchByTitle(testData.item.instanceName);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.item.instanceName);
        InventorySearchAndFilter.checkRowsCount(1);

        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        InventoryInstance.addItem();
        ItemRecordNew.waitLoading(testData.item.instanceName);

        ItemRecordNew.clickStatisticalCodeButton();
        ItemRecordNew.clickFormerIdentifierButton();
        ItemRecordNew.clickAddAdministrativeNoteButton();
        ItemRecordNew.clickAddYearCaptionButton();
        ItemRecordNew.clickAddNoteButton();
        ItemRecordNew.clickAddCheckInCheckOutNoteButton();
        ItemRecordNew.clickAddElectronicAccessButton();
      },
    );
  });
});
