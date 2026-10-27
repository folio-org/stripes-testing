import { ITEM_STATUS_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C1464226_FolioInstance_${randomPostfix}`,
      initialBarcode: `AT_C1464226_ItemBarcode1_${randomPostfix}`,
      updatedBarcode: `AT_C1464226_ItemBarcode2_${randomPostfix}`,
      callNumberValue: `AT_C1464226_CallNumber_${randomPostfix}`,
      copyNumberValue: `AT_C1464226_CopyNumber_${randomPostfix}`,
      chronologyValue: `AT_C1464226_Chronology_${randomPostfix}`,
    };

    let user;
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          testData.locationId = location.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
          testData.materialTypeId = materialType.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
          holdings: [{ permanentLocationId: testData.locationId }],
          items: [
            {
              barcode: testData.initialBarcode,
              materialType: { id: testData.materialTypeId },
              permanentLoanType: { id: testData.loanTypeId },
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            },
          ],
        }).then(({ instanceId: createdInstanceId }) => {
          instanceId = createdInstanceId;
        });

        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;
          cy.assignCapabilitiesToExistingUser(user.userId, [], [CapabilitySets.uiInventory]);

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C1464226 Enter key in textbox on item edit form triggers "Save & close" (promin)',
      { tags: ['extendedPath', 'promin', 'C1464226'] },
      () => {
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingItem({ barcode: testData.initialBarcode });

        // Step 1: Actions > Edit opens the item edit form
        ItemRecordView.openItemEditForm(testData.instanceTitle);

        // Step 2: type into a non-resizable textbox (Barcode), press Enter - item saves,
        // form closes, Item detail view is displayed
        ItemRecordEdit.addBarcode(testData.updatedBarcode);
        ItemRecordEdit.pressEnterInBarcodeField();
        ItemRecordView.waitLoading();
        ItemRecordView.verifyItemBarcode(testData.updatedBarcode);

        // Step 3 (representative, not every textbox):

        // a. resizable textbox (Call number) - Enter doesn't submit the form, item is not saved
        ItemRecordView.openItemEditForm(testData.instanceTitle);
        ItemRecordEdit.addCallNumberValue(testData.callNumberValue);
        ItemRecordEdit.verifyCallNumberValue(testData.callNumberValue);
        ItemRecordEdit.pressEnterInCallNumberField();
        ItemRecordEdit.verifyCallNumberValue(`${testData.callNumberValue}\n`);
        cy.wait(2000); // make sure the pane remains opened
        ItemRecordEdit.verifyFormIsStillOpen(testData.instanceTitle);
        ItemRecordEdit.cancel();
        ItemRecordEdit.closeCancelEditingModal();
        ItemRecordView.waitLoading();

        // b. non-resizable textbox (Copy number) - Enter submits the form, item is saved
        ItemRecordView.openItemEditForm(testData.instanceTitle);
        ItemRecordEdit.addCopyNumberValue(testData.copyNumberValue);
        ItemRecordEdit.verifyCopyNumberValue(testData.copyNumberValue);
        ItemRecordEdit.pressEnterInCopyNumberField();
        ItemRecordView.waitLoading();
        ItemRecordView.checkCopyNumber(testData.copyNumberValue);

        // c. resizable textbox (Chronology) - Enter doesn't submit the form, item is not saved
        ItemRecordView.openItemEditForm(testData.instanceTitle);
        ItemRecordEdit.addChronology(testData.chronologyValue);
        ItemRecordEdit.verifyChronologyNumberValue(testData.chronologyValue);
        ItemRecordEdit.pressEnterInChronologyField();
        ItemRecordEdit.verifyChronologyNumberValue(`${testData.chronologyValue}\n`);
        cy.wait(2000); // make sure the pane remains opened
        ItemRecordEdit.verifyFormIsStillOpen(testData.instanceTitle);
      },
    );
  });
});
