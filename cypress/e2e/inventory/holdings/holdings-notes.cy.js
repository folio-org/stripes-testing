import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  item: {
    instanceName: `C624 Inventory Instance ${getRandomPostfix()}`,
    itemBarcode: randomFourDigitNumber(),
  },
  noteType: 'Copy note',
  holdingsNote: `Test${getRandomPostfix()}`,
  updatedHoldingsNote: `Test update${getRandomPostfix()}`,
};

describe('Inventory', () => {
  describe('Holdings', () => {
    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.createInstanceViaApi(
        testData.item.instanceName,
        testData.item.itemBarcode,
      );

      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        testData.user = createdUserProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.itemBarcode);
      Users.deleteViaApi(testData.user.userId);
    });

    it('C624 Holdings notes (folijet)', { tags: ['extendedPath', 'folijet', 'C624'] }, () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.item.instanceName);
      InventorySearchAndFilter.selectViewHoldings();
      HoldingsRecordView.edit();
      HoldingsRecordEdit.waitLoading();
      HoldingsRecordEdit.addHoldingsNotes(testData.holdingsNote, testData.noteType);
      HoldingsRecordEdit.saveAndClose();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.edit();
      HoldingsRecordEdit.editHoldingsNotes(testData.updatedHoldingsNote);
      HoldingsRecordEdit.saveAndClose();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.checkHoldingsNoteByRow([testData.updatedHoldingsNote, 'No']);
    });
  });
});
