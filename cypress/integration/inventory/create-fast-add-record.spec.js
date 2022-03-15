import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import { PaneHeader } from '../../../interactors';
import FastAddNewRecord from '../../support/fragments/inventory/fastAddNewRecord';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import ItemRecordView from '../../support/fragments/inventory/itemRecordView';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InteractorsTools from '../../support/utils/interactorsTools';
import { getLongDelay } from '../../support/utils/cypressTools';

describe('ui-inventory: Create fast add record', () => {
  const timeStamp = {
    start: null,
    end: null,
  };

  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );

    cy.intercept('POST', '/inventory/instances').as('createInstance');
    cy.intercept('POST', '/holdings-storage/holdings').as('createHolding');
    cy.intercept('POST', '/inventory/items').as('createItem');

    cy.visit(TopMenu.inventorySettingsFastAddPath);
    FastAddNewRecord.setDefaultInstanceStatus(
      FastAddNewRecord.fastAddNewRecordFormDetails.instanceStatusCodeOption
    );
    FastAddNewRecord.saveFastAddSettings();
    InteractorsTools.checkCalloutMessage(
      FastAddNewRecord.calloutMessages.SETTING_UPDATE_SUCCESS
    );
    cy.visit(TopMenu.inventoryPath);
  });

  afterEach('reset "Fast add" setting', () => {
    cy.visit(TopMenu.inventorySettingsFastAddPath);
    FastAddNewRecord.setDefaultInstanceStatus(
      FastAddNewRecord.fastAddNewRecordFormDetails.defaultInstanceStatusCodeOption
    );
    FastAddNewRecord.saveFastAddSettings();
    InteractorsTools.checkCalloutMessage(
      FastAddNewRecord.calloutMessages.SETTING_UPDATE_SUCCESS
    );
  });

  it('C15850 Create a fast add record from Inventory. Monograph.', { tags: [testTypes.smoke] }, () => {
    cy.do([
      InventoryActions.open(),
      InventoryActions.options.newFastAddRecord.click()
    ]);

    // ensure "New fast add record" form is open
    cy.expect(PaneHeader('New fast add record').exists());
    FastAddNewRecord.fillFastAddNewRecordForm(FastAddNewRecord.fastAddNewRecordFormDetails);

    // set starting timestamp right before saving
    timeStamp.start = new Date();
    FastAddNewRecord.saveAndClose();

    cy.wait(['@createInstance', '@createHolding', '@createItem'], getLongDelay())
      .then(() => {
        // set ending timestamp after saving
        timeStamp.end = new Date();

        InteractorsTools.checkCalloutMessage(
          FastAddNewRecord.calloutMessages.INVENTORY_RECORDS_CREATE_SUCCESS
        );
        InventorySearch.switchToItem();
        InventorySearch.searchByParameter('Barcode', FastAddNewRecord.fastAddNewRecordFormDetails.itemBarcode);
        FastAddNewRecord.openRecordDetails();

        // verify instance details
        FastAddNewRecord.verifyRecordCreatedDate(timeStamp);
        InstanceRecordView.verifyResourceTitle(FastAddNewRecord.fastAddNewRecordFormDetails.resourceTitle);
        InstanceRecordView.verifyInstanceStatusCode(
          FastAddNewRecord.fastAddNewRecordFormDetails.instanceStatusCodeValue
        );
        InstanceRecordView.verifyResourceType(
          FastAddNewRecord.fastAddNewRecordFormDetails.resourceType
        );

        // verify holdings details
        FastAddNewRecord.viewHoldings();
        FastAddNewRecord.verifyRecordCreatedDate(timeStamp);
        FastAddNewRecord.verifyPermanentLocation(
          FastAddNewRecord.fastAddNewRecordFormDetails.permanentLocationValue
        );
        FastAddNewRecord.closeHoldingsRecordView();

        // verify item details
        ItemRecordView.viewItem(
          FastAddNewRecord.fastAddNewRecordFormDetails.permanentLocationValue,
          FastAddNewRecord.fastAddNewRecordFormDetails.itemBarcode
        );
        FastAddNewRecord.verifyRecordCreatedDate(timeStamp);
        ItemRecordView.verifyPermanentLoanType(FastAddNewRecord.fastAddNewRecordFormDetails.permanentLoanType);
        ItemRecordView.verifyItemBarcode(FastAddNewRecord.fastAddNewRecordFormDetails.itemBarcode);
        ItemRecordView.verifyNote(FastAddNewRecord.fastAddNewRecordFormDetails.note);
      });
  });
});
