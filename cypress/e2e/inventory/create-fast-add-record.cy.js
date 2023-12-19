import { INSTANCE_STATUS_TERM_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import FastAddNewRecord from '../../support/fragments/inventory/fastAddNewRecord';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import FastAdd from '../../support/fragments/settings/inventory/instance-holdings-item/fastAdd';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getLongDelay } from '../../support/utils/cypressTools';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('inventory', () => {
  describe('Fast Add', () => {
    const timeStamp = {
      start: null,
      end: null,
    };
    const instanceStatusCodeValue = INSTANCE_STATUS_TERM_NAMES.UNCATALOGED;
    let userId;

    beforeEach(() => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySettingsFastAdd.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);

        cy.intercept('POST', '/inventory/instances').as('createInstance');
        cy.intercept('POST', '/holdings-storage/holdings').as('createHolding');
        cy.intercept('POST', '/inventory/items').as('createItem');

        cy.visit(TopMenu.inventorySettingsFastAddPath);
        FastAdd.changeDefaultInstanceStatus(instanceStatusCodeValue);
      });
    });

    afterEach('reset "Fast add" setting', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          FastAddNewRecord.fastAddNewRecordFormDetails.itemBarcode,
        );
        cy.visit(TopMenu.inventorySettingsFastAddPath);
        FastAdd.changeDefaultInstanceStatus('Select instance status');
        Users.deleteViaApi(userId);
      });
    });

    it(
      'C15850 Create a fast add record from Inventory. Monograph. (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        cy.visit(TopMenu.inventoryPath);
        InventoryActions.openNewFastAddRecordForm();
        FastAddNewRecord.waitLoading();
        FastAddNewRecord.fillFastAddNewRecordForm(FastAddNewRecord.fastAddNewRecordFormDetails);

        // set starting timestamp right before saving
        timeStamp.start = new Date();
        FastAddNewRecord.saveAndClose();

        cy.wait(['@createInstance', '@createHolding', '@createItem'], getLongDelay()).then(() => {
          // set ending timestamp after saving
          timeStamp.end = new Date();

          InteractorsTools.checkCalloutMessage(
            FastAdd.calloutMessages.INVENTORY_RECORDS_CREATE_SUCCESS,
          );
          InventorySearchAndFilter.searchInstanceByTitle(
            FastAddNewRecord.fastAddNewRecordFormDetails.resourceTitle,
          );
          FastAddNewRecord.openRecordDetails();

          // verify instance details
          FastAddNewRecord.verifyRecordCreatedDate(timeStamp);
          InstanceRecordView.verifyResourceTitle(
            FastAddNewRecord.fastAddNewRecordFormDetails.resourceTitle,
          );
          InstanceRecordView.verifyInstanceStatusCode(
            FastAddNewRecord.fastAddNewRecordFormDetails.instanceStatusCodeValue,
          );
          InstanceRecordView.verifyResourceType(
            FastAddNewRecord.fastAddNewRecordFormDetails.resourceType,
          );

          // verify holdings details
          FastAddNewRecord.viewHoldings();
          FastAddNewRecord.verifyRecordCreatedDate(timeStamp);
          FastAddNewRecord.verifyPermanentLocation(
            FastAddNewRecord.fastAddNewRecordFormDetails.permanentLocationValue,
          );
          FastAddNewRecord.closeHoldingsRecordView();

          // verify item details
          InventoryInstance.openHoldings([
            FastAddNewRecord.fastAddNewRecordFormDetails.permanentLocationValue,
          ]);
          InventoryInstance.openItemByBarcode(
            FastAddNewRecord.fastAddNewRecordFormDetails.itemBarcode,
          );
          FastAddNewRecord.verifyRecordCreatedDate(timeStamp);
          ItemRecordView.verifyPermanentLoanType(
            FastAddNewRecord.fastAddNewRecordFormDetails.permanentLoanType,
          );
          ItemRecordView.verifyItemBarcode(
            FastAddNewRecord.fastAddNewRecordFormDetails.itemBarcode,
          );
          ItemRecordView.verifyNote(FastAddNewRecord.fastAddNewRecordFormDetails.note);
        });
      },
    );
  });
});
