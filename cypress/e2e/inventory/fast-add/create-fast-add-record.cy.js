import { APPLICATION_NAMES, INSTANCE_STATUS_TERM_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FastAddNewRecord from '../../../support/fragments/inventory/fastAddNewRecord';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import FastAdd from '../../../support/fragments/settings/inventory/instance-holdings-item/fastAdd';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Fast Add', () => {
    const timeStamp = {
      start: null,
      end: null,
    };
    const instanceStatusCodeValue = INSTANCE_STATUS_TERM_NAMES.UNCATALOGED;
    let user;

    beforeEach('Create test data and login', () => {
      cy.loginAsAdmin();
      TopMenuNavigation.openAppFromDropdown(
        APPLICATION_NAMES.SETTINGS,
        APPLICATION_NAMES.INVENTORY,
      );
      SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FAST_ADD);
      FastAdd.changeDefaultInstanceStatus(instanceStatusCodeValue);

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          FastAddNewRecord.fastAddNewRecordFormDetails.itemBarcode,
        );
        Users.deleteViaApi(user.userId);
      });
      cy.loginAsAdmin();
      TopMenuNavigation.openAppFromDropdown(
        APPLICATION_NAMES.SETTINGS,
        APPLICATION_NAMES.INVENTORY,
      );
      SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FAST_ADD);
      FastAdd.changeDefaultInstanceStatus('Select instance status');
    });

    it(
      'C15850 Create a fast add record from Inventory. Monograph. (folijet)',
      { tags: ['smoke', 'folijet', 'shiftLeft', 'C15850', 'eurekaPhase1'] },
      () => {
        cy.intercept('POST', '/inventory/instances').as('createInstance');
        cy.intercept('POST', '/holdings-storage/holdings').as('createHolding');
        cy.intercept('POST', '/inventory/items').as('createItem');
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
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

    it(
      'C16972 Create a fast add record from Inventory. Journal issue. (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C16972', 'eurekaPhase1'] },
      () => {
        const fastAddRecord = { ...FastAddNewRecord.fastAddNewRecordFormDetails };
        fastAddRecord.resourceTitle = `Journal issue${randomFourDigitNumber()}`;
        fastAddRecord.note = 'Note For Journal Issue';

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventoryActions.openNewFastAddRecordForm();
        FastAddNewRecord.waitLoading();
        FastAddNewRecord.fillFastAddNewRecordForm(fastAddRecord);

        // set starting timestamp right before saving
        timeStamp.start = new Date();
        FastAddNewRecord.saveAndClose();

        cy.wait(['@createInstance', '@createHolding', '@createItem'], getLongDelay()).then(() => {
          // set ending timestamp after saving
          timeStamp.end = new Date();

          InteractorsTools.checkCalloutMessage(
            FastAdd.calloutMessages.INVENTORY_RECORDS_CREATE_SUCCESS,
          );
          InventorySearchAndFilter.searchByParameter('Title (all)', fastAddRecord.resourceTitle);
          FastAddNewRecord.openRecordDetails();

          // verify instance details
          FastAddNewRecord.verifyRecordCreatedDate(timeStamp);
          InstanceRecordView.verifyResourceTitle(fastAddRecord.resourceTitle);
          InstanceRecordView.verifyInstanceStatusCode(fastAddRecord.instanceStatusCodeValue);
          InstanceRecordView.verifyResourceType(fastAddRecord.resourceType);

          // verify holdings details
          FastAddNewRecord.viewHoldings();
          FastAddNewRecord.verifyRecordCreatedDate(timeStamp);
          FastAddNewRecord.verifyPermanentLocation(fastAddRecord.permanentLocationValue);
          FastAddNewRecord.closeHoldingsRecordView();

          // verify item details
          InventoryInstance.openHoldings([fastAddRecord.permanentLocationValue]);
          InventoryInstance.openItemByBarcode(fastAddRecord.itemBarcode);
          FastAddNewRecord.verifyRecordCreatedDate(timeStamp);
          ItemRecordView.verifyPermanentLoanType(fastAddRecord.permanentLoanType);
          ItemRecordView.verifyItemBarcode(fastAddRecord.itemBarcode);
          ItemRecordView.verifyNote(fastAddRecord.note);
        });
      },
    );
  });
});
