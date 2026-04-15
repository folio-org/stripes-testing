import {
  APPLICATION_NAMES,
  MATERIAL_TYPE_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import FastAddNewRecord from '../../../../support/fragments/inventory/fastAddNewRecord';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import FastAdd from '../../../../support/fragments/settings/inventory/instance-holdings-item/fastAdd';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Inventory', () => {
  describe('Fast Add', () => {
    const fastAddNewRecordFormDetails = {
      instanceStatusCodeValue: 'uncat',
      resourceTitle: `Monograph${getRandomPostfix()}`,
      resourceType: 'text',
      permanentLocationOption: '',
      permanentLocationValue: '',
      itemBarcode: `${getRandomPostfix()}Barcode`,
      materialType: MATERIAL_TYPE_NAMES.CD,
      permanentLoanType: LOAN_TYPE_NAMES.SELECTED,
      note: 'note for monograph',
    };

    before('Set instance status', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps(true);
      cy.getLocations({ limit: 1 }).then((location) => {
        fastAddNewRecordFormDetails.permanentLocationOption = `${location.name} `;
        fastAddNewRecordFormDetails.permanentLocationValue = location.name;
      });
      FastAdd.changeDefaultInstanceStatusViaApi('uncat');

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password);
      cy.allure().logCommandSteps(true);
    });

    after('Delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps(true);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        fastAddNewRecordFormDetails.itemBarcode,
      );
    });

    it(
      'C15850 Create a fast add record from Inventory. Monograph. (folijet)',
      { tags: ['dryRun', 'folijet', 'C15850'] },
      () => {
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventoryActions.openNewFastAddRecordForm();
        FastAddNewRecord.waitLoading();
        FastAddNewRecord.fillFastAddNewRecordForm(fastAddNewRecordFormDetails);
        FastAddNewRecord.saveAndClose();

        InteractorsTools.checkCalloutMessage(
          FastAdd.calloutMessages.INVENTORY_RECORDS_CREATE_SUCCESS,
        );
        InventorySearchAndFilter.searchByParameter(
          'Title (all)',
          fastAddNewRecordFormDetails.resourceTitle,
        );
        FastAddNewRecord.openRecordDetails();

        // verify instance details
        InstanceRecordView.verifyResourceTitle(fastAddNewRecordFormDetails.resourceTitle);
        InstanceRecordView.verifyInstanceStatusCode(
          fastAddNewRecordFormDetails.instanceStatusCodeValue,
        );
        InstanceRecordView.verifyResourceType(fastAddNewRecordFormDetails.resourceType);

        // verify holdings details
        FastAddNewRecord.viewHoldings();
        FastAddNewRecord.verifyPermanentLocation(
          fastAddNewRecordFormDetails.permanentLocationValue,
        );
        FastAddNewRecord.closeHoldingsRecordView();

        // verify item details
        InventoryInstance.openHoldings([fastAddNewRecordFormDetails.permanentLocationValue]);
        InventoryInstance.openItemByBarcode(fastAddNewRecordFormDetails.itemBarcode);
        ItemRecordView.verifyPermanentLoanType(fastAddNewRecordFormDetails.permanentLoanType);
        ItemRecordView.verifyItemBarcode(fastAddNewRecordFormDetails.itemBarcode);
        ItemRecordView.verifyNote(fastAddNewRecordFormDetails.note);
      },
    );
  });
});
