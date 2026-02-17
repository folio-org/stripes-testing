import { APPLICATION_NAMES, LOCATION_NAMES } from '../../../../support/constants';
import FastAddNewRecord from '../../../../support/fragments/inventory/fastAddNewRecord';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import FastAdd from '../../../../support/fragments/settings/inventory/instance-holdings-item/fastAdd';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Inventory', () => {
  describe('Fast Add', () => {
    const timeStamp = {
      start: null,
      end: null,
    };

    before('Set instance status', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });
      FastAdd.changeDefaultInstanceStatusViaApi('uncat');

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password);
      cy.allure().logCommandSteps(true);
    });

    after('Delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false }).then(() => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          FastAddNewRecord.fastAddNewRecordFormDetails.itemBarcode,
        );
      });
    });

    it(
      'C15850 Create a fast add record from Inventory. Monograph. (folijet)',
      { tags: ['dryRun', 'folijet'] },
      () => {
        cy.intercept('POST', '/inventory/instances').as('createInstance');
        cy.intercept('POST', '/holdings-storage/holdings').as('createHolding');
        cy.intercept('POST', '/inventory/items').as('createItem');
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
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
          InventorySearchAndFilter.searchByParameter(
            'Title (all)',
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
          FastAddNewRecord.verifyPermanentLocation(LOCATION_NAMES.ANNEX_UI);
          FastAddNewRecord.closeHoldingsRecordView();

          // verify item details
          InventoryInstance.openHoldings([LOCATION_NAMES.ANNEX_UI]);
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
