import { including } from '@interactors/html';
import { LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  item: {
    instanceName: `Inventory Instance ${randomFourDigitNumber()}`,
    itemBarcode: randomFourDigitNumber(),
  },
  statisticalCode: 'Book, print (books)',
  secondStatisticalCode: 'Books, electronic (ebooks)',
  errorMessage: 'Please select to continue',
  calloutMessage: 'has been successfully saved.',
};

describe('Inventory', () => {
  describe('Holdings', () => {
    before('Create test data and login', () => {
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

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
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
    });

    it(
      'C396396 Verify the inability to save empty statistical code field on Holdings create/edit page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C396396', 'eurekaPhase1'] },
      () => {
        InventoryInstances.searchByTitle(testData.item.instanceName);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.item.instanceName);
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.waitLoading();

        HoldingsRecordEdit.clickAddStatisticalCode();

        HoldingsRecordEdit.changePermanentLocation(LOCATION_NAMES.ANNEX);
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordEdit.checkErrorMessageForStatisticalCode(true);

        HoldingsRecordEdit.chooseStatisticalCode(testData.statisticalCode);
        HoldingsRecordEdit.checkErrorMessageForStatisticalCode(false);

        HoldingsRecordEdit.removeStatisticalCode(testData.statisticalCode);
        HoldingsRecordEdit.verifyStatisticalCodesCount(0);

        HoldingsRecordEdit.clickAddStatisticalCode();
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordEdit.checkErrorMessageForStatisticalCode(true);

        HoldingsRecordEdit.chooseStatisticalCode(testData.statisticalCode);
        HoldingsRecordEdit.checkErrorMessageForStatisticalCode(false);

        HoldingsRecordEdit.saveAndClose();
        InventoryInstance.waitLoading();
        InventoryInstance.checkCalloutMessage(including(testData.calloutMessage));
        InventoryInstance.checkIsHoldingsCreated([`${LOCATION_NAMES.ANNEX_UI} >`]);

        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        HoldingsRecordEdit.removeStatisticalCode(testData.statisticalCode);
        HoldingsRecordEdit.verifyStatisticalCodesCount(0);
        HoldingsRecordEdit.clickAddStatisticalCode();
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordEdit.checkErrorMessageForStatisticalCode(true);

        HoldingsRecordEdit.chooseStatisticalCode(testData.secondStatisticalCode);
        HoldingsRecordEdit.checkErrorMessageForStatisticalCode(false);

        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.close();
        InventoryInstance.checkCalloutMessage(including(testData.calloutMessage));
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkStatisticalCode(testData.secondStatisticalCode);
      },
    );
  });
});
