import { including } from 'bigtest';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import TopMenu from '../../../support/fragments/topMenu';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import { LOCATION_NAMES } from '../../../support/constants';

const testData = {
  user: {},
  item: {
    instanceName: `Inventory Instance ${randomFourDigitNumber()}`,
    itemBarcode: randomFourDigitNumber(),
  },
  // statisticalCode: 'Book, print (books)',
  // secondStatisticalCode: 'Books, electronic (ebooks)',
  // errorMessage: 'Please select to continue',
  // calloutMessage: 'has been successfully saved.',
};

describe('Holdings', () => {
  before('Create test data', () => {
    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 });
          cy.getInstanceIdentifierTypes({ limit: 1 });
        })
        .then(() => {
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: testData.item.instanceName,
            },
          }).then((specialInstanceId) => {
            testData.item.instanceId = specialInstanceId;
          });
        });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getHoldings({
      limit: 1,
      query: `"instanceId"="${testData.item.instanceId}"`,
    })
      .then((holdings) => {
        testData.item.holdingUUID = holdings[0].id;
      })
      .then(() => {
        cy.deleteHoldingRecordViaApi(testData.item.holdingUUID);
      });
    InventoryInstance.deleteInstanceViaApi(testData.item.instanceId);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C400653 Check the new formatting of Statistical codes field on Holdings create/edit screen (folijet) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.folijet] },
    () => {
      // #1 Go to "Inventory" application -> Search and select the Instance from precondition
      InventoryInstance.searchByTitle(testData.item.instanceName);
      InventorySearchAndFilter.verifyInstanceDisplayed(testData.item.instanceName);
      InventorySearchAndFilter.checkRowsCount(1);
      InventoryInstances.selectInstance();
      InventoryInstance.waitLoading();

      // #2 Click "Add holdings" button
      InventoryInstance.pressAddHoldingsButton();
      HoldingsRecordEdit.waitLoading();

      // #3 Click "Add statistical code" button
      HoldingsRecordEdit.clickAddStatisticalCode();

      // #4 Populate "Permanent*" dropdown in "Location" accordion with any value (e.g. Online (E)) -> Click "Save & close" button
      HoldingsRecordEdit.changePermanentLocation(LOCATION_NAMES.ANNEX);
      HoldingsRecordEdit.saveAndClose();
      HoldingsRecordEdit.checkErrorMessageForStatisticalCode(true);

      // #5 Select any value in "Statistical code" field
      HoldingsRecordEdit.chooseStatisticalCode(testData.statisticalCode);
      HoldingsRecordEdit.checkErrorMessageForStatisticalCode(false);

      // #6 Click on trash can on the "Statistical code" field
      HoldingsRecordEdit.removeStatisticalCode(testData.statisticalCode);
      HoldingsRecordEdit.verifyStatisticalCodesCount(0);

      // #7 Click "Add statistical code" button -> Click "Save & close" button
      HoldingsRecordEdit.clickAddStatisticalCode();
      HoldingsRecordEdit.saveAndClose();
      HoldingsRecordEdit.checkErrorMessageForStatisticalCode(true);

      // #8 Select any value in "Statistical code" field
      HoldingsRecordEdit.chooseStatisticalCode(testData.statisticalCode);
      HoldingsRecordEdit.checkErrorMessageForStatisticalCode(false);

      // #9 Click "Save & close" button
      HoldingsRecordEdit.saveAndClose();
      InventoryInstance.waitLoading();
      InventoryInstance.checkCalloutMessage(including(testData.calloutMessage));
      InventoryInstance.checkIsHoldingsCreated([`${LOCATION_NAMES.ANNEX_UI} >`]);

      // #10 Click "View holdings" button -> Click "Actions" button -> Select "Edit" option
      InventoryInstance.openHoldingView();
      HoldingsRecordView.edit();
      HoldingsRecordEdit.waitLoading();

      // #11 Repeat steps 6-7
      HoldingsRecordEdit.removeStatisticalCode(testData.statisticalCode);
      HoldingsRecordEdit.verifyStatisticalCodesCount(0);
      HoldingsRecordEdit.clickAddStatisticalCode();
      HoldingsRecordEdit.saveAndClose();
      HoldingsRecordEdit.checkErrorMessageForStatisticalCode(true);

      // #12 Select any value in "Statistical code" field
      HoldingsRecordEdit.chooseStatisticalCode(testData.secondStatisticalCode);
      HoldingsRecordEdit.checkErrorMessageForStatisticalCode(false);

      // #13 Click "Save & close" button
      HoldingsRecordEdit.saveAndClose();
      HoldingsRecordView.waitLoading();
      InventoryInstance.checkCalloutMessage(including(testData.calloutMessage));
      HoldingsRecordView.checkStatisticalCode(testData.secondStatisticalCode);
    },
  );
});
