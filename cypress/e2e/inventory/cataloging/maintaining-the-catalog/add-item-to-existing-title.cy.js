import uuid from 'uuid';
import {
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Cataloging -> Maintaining the catalog', () => {
    let user;
    const testData = {
      permanentLocation: 'Annex (KU/CC/DI/A) ',
      callNumber: '123456',
      callNumberSuffix: 'AD',
      barcode: uuid(),
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
      itemStatus: ITEM_STATUS_NAMES.AVAILABLE,
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instanceRecord = instanceData;
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
      });
    });

    it(
      'C3494 Add an item to an existing title. There is already a copy at another library branch. (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C3494'] },
      () => {
        InventorySearchAndFilter.searchByParameter(
          'Title (all)',
          testData.instanceRecord.instanceTitle,
        );
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.addHoldings();
        InventoryNewHoldings.fillPermanentLocation(testData.permanentLocation);
        InventoryNewHoldings.fillCallNumber(testData.callNumber);
        InventoryNewHoldings.fillCallNumberSuffix(testData.callNumberSuffix);
        InventoryNewHoldings.saveAndClose();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyIsHoldingsCreated([
          `${LOCATION_NAMES.ANNEX_UI} >  ${testData.callNumber} ${testData.callNumberSuffix}`,
        ]);
        InventoryInstance.addItem();
        ItemRecordNew.addBarcode(testData.barcode);
        ItemRecordNew.addMaterialType(testData.materialType);
        ItemRecordNew.addPermanentLoanType(testData.permanentLoanType);
        ItemRecordNew.save();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InventoryInstance.openHoldingsAccordion(
          `Holdings: ${LOCATION_NAMES.ANNEX_UI} > ${testData.callNumber} ${testData.callNumberSuffix}`,
        );
        InstanceRecordView.verifyItemIsCreated(
          `${LOCATION_NAMES.ANNEX_UI} >  ${testData.callNumber} ${testData.callNumberSuffix}`,
          testData.barcode,
        );
        InventoryInstance.verifyItemStatus(testData.itemStatus);
      },
    );
  });
});
