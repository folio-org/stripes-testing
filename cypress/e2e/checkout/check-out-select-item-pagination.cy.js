import { Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES, LOCATION_IDS } from '../../support/constants';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import SelectItemModal from '../../support/fragments/check-out-actions/selectItemModal';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Check out', () => {
  const userData = {
    personal: {},
  };
  let servicePoint;
  const testData = {};
  let randomPostfix;
  let largeSetPrefix;
  let smallSetPrefix;
  const numberOfLargeSetItems = 230; // Between 200-300
  const numberOfSmallSetItems = 70; // Less than 100

  before('Creating test data', () => {
    randomPostfix = getRandomPostfix();
    largeSetPrefix = `test${randomPostfix}`;
    smallSetPrefix = `barcode${randomPostfix}`;

    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
        servicePoint = sp;
      });
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      cy.getHoldingTypes({ limit: 1 }).then((res) => {
        testData.holdingTypeId = res[0].id;
      });
      cy.createLoanType({
        name: `loanType_${getRandomPostfix()}`,
      }).then((loanType) => {
        testData.loanTypeId = loanType.id;
      });
      cy.getDefaultMaterialType().then((res) => {
        testData.materialTypeId = res.id;
      });
    });

    cy.getAdminToken().then(() => {
      // Enable wildcard lookup
      OtherSettings.setOtherSettingsViaApi({
        wildcardLookupEnabled: true,
      });

      // Create instance for large set (200-300 items)
      const largeSetItems = [];
      for (let i = 1; i <= numberOfLargeSetItems; i++) {
        largeSetItems.push({
          barcode: `${largeSetPrefix}${i}`,
          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
          permanentLoanType: { id: testData.loanTypeId },
          materialType: { id: testData.materialTypeId },
        });
      }

      InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId: testData.instanceTypeId,
          title: `Instance_LargeSet_C651501_${randomPostfix}`,
        },
        holdings: [
          {
            holdingsTypeId: testData.holdingTypeId,
            permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
          },
        ],
        items: largeSetItems,
      }).then((specialInstanceIds) => {
        testData.largeSetInstanceId = specialInstanceIds.instanceId;
      });

      // Create instance for small set (<100 items)
      const smallSetItems = [];
      for (let i = 1; i <= numberOfSmallSetItems; i++) {
        smallSetItems.push({
          barcode: `${smallSetPrefix}${i}`,
          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
          permanentLoanType: { id: testData.loanTypeId },
          materialType: { id: testData.materialTypeId },
        });
      }

      InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId: testData.instanceTypeId,
          title: `Instance_SmallSet_C651501_${randomPostfix}`,
        },
        holdings: [
          {
            holdingsTypeId: testData.holdingTypeId,
            permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
          },
        ],
        items: smallSetItems,
      }).then((specialInstanceIds) => {
        testData.smallSetInstanceId = specialInstanceIds.instanceId;
      });
    });

    cy.createTempUser([Permissions.checkoutAll.gui]).then((userProperties) => {
      userData.personal.lastname = userProperties.username;
      userData.password = userProperties.password;
      userData.userId = userProperties.userId;
      userData.barcode = userProperties.barcode;

      UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);

      cy.login(userData.personal.lastname, userData.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });
    });
  });

  after('Deleting test data', () => {
    cy.getAdminToken();
    // Disable wildcard lookup
    OtherSettings.setOtherSettingsViaApi({
      wildcardLookupEnabled: false,
    });
    // Delete instances with all items using the first barcode in each set
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(`${largeSetPrefix}1`);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(`${smallSetPrefix}1`);
    Users.deleteViaApi(userData.userId);
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C651501 Check pagination on the "Select item" dialog in Check-out (vega)',
    { tags: ['extendedPath', 'vega', 'C651501'] },
    () => {
      // Step 1: Scan any user barcode
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.waitForPatronSpinnerToDisappear();
      // Verify user scanned and user information is displayed
      CheckOutActions.checkUserInfo(userData);

      // Step 2: Scan a barcode that returns less than 100 results
      CheckOutActions.checkOutItem(smallSetPrefix);
      // Verify "Select item" modal opened
      SelectItemModal.waitLoading();
      SelectItemModal.verifyModalTitle();
      // Verify "List of items: choose one # Records found" text displayed at the top of the modal
      SelectItemModal.verifyRecordsFoundText(numberOfSmallSetItems);
      // Verify "Previous" button on the left bottom of the modal is disabled
      SelectItemModal.verifyPreviousButtonState(false);
      // Note: Pagination text "1-70" is not displayed when there are <100 items (no pagination UI rendered)
      // Verify "Next" button on the right bottom of the modal is disabled
      SelectItemModal.verifyNextButtonState(false);
      // Close modal
      SelectItemModal.closeModal();

      // Step 3: Scan a barcode that returns more than 200 but less than 300
      CheckOutActions.checkOutItem(largeSetPrefix);
      // Verify "Select item" modal opened
      SelectItemModal.waitLoading();
      SelectItemModal.verifyModalTitle();
      // Verify "List of items: choose one # Records Found" text displayed at the top of the modal
      SelectItemModal.verifyRecordsFoundText(numberOfLargeSetItems);
      // Verify "Previous" button on the left bottom of the modal is disabled
      SelectItemModal.verifyPreviousButtonState(false);
      // Verify "1-100" text in the middle bottom of the modal displayed
      SelectItemModal.verifyPaginationText('1 - 100');
      // Verify "Next" button on the right bottom of the modal is enabled
      SelectItemModal.verifyNextButtonState(true);

      // Step 4: Click on "Next" button
      SelectItemModal.clickNextButton();
      // Verify "Previous" button on the left bottom of the modal is enabled
      SelectItemModal.verifyPreviousButtonState(true);
      // Verify "101-200" text in the middle bottom of the modal displayed
      SelectItemModal.verifyPaginationText('101 - 200');
      // Verify "Next" button on the right bottom of the modal is enabled
      SelectItemModal.verifyNextButtonState(true);

      // Step 5: Click on "Previous" button
      SelectItemModal.clickPreviousButton();
      // Verify "Previous" button on the left bottom of the modal is disabled
      SelectItemModal.verifyPreviousButtonState(false);
      // Verify "1-100" text in the middle bottom of the modal displayed
      SelectItemModal.verifyPaginationText('1 - 100');
      // Verify "Next" button on the right bottom of the modal is enabled
      SelectItemModal.verifyNextButtonState(true);

      // Step 6: Click on "Next" button
      SelectItemModal.clickNextButton();
      // Verify "Previous" button on the left bottom of the modal is enabled
      SelectItemModal.verifyPreviousButtonState(true);
      // Verify "101-200" text in the middle bottom of the modal displayed
      SelectItemModal.verifyPaginationText('101 - 200');
      // Verify "Next" button on the right bottom of the modal is enabled
      SelectItemModal.verifyNextButtonState(true);

      // Step 7: Click on "Next" button
      SelectItemModal.clickNextButton();
      // Verify "Previous" button on the left bottom of the modal is enabled
      SelectItemModal.verifyPreviousButtonState(true);
      // Verify "201-#(236 for example)" text in the middle bottom of the modal displayed
      SelectItemModal.verifyPaginationText(`201 - ${numberOfLargeSetItems}`);
      // Verify "Next" button on the right bottom of the modal is disabled
      SelectItemModal.verifyNextButtonState(false);

      // Clean up: Close the modal
      SelectItemModal.closeModal();
    },
  );
});
