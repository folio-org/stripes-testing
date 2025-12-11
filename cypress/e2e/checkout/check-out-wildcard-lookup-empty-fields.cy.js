import { Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES, LOCATION_IDS } from '../../support/constants';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
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
  const randomPostfix = getRandomPostfix();
  const itemBarcode1 = `11${randomPostfix}`;
  const itemBarcode2 = `111${randomPostfix}`;
  const partialBarcode = '1';

  before('Creating test data', () => {
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
      OtherSettings.setOtherSettingsViaApi({
        wildcardLookupEnabled: true,
      });

      testData.instanceTitle = `Instance_C688738_${getRandomPostfix()}`;

      InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId: testData.instanceTypeId,
          title: testData.instanceTitle,
        },
        holdings: [
          {
            holdingsTypeId: testData.holdingTypeId,
            permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
          },
        ],
        items: [
          {
            barcode: itemBarcode1,
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          },
          {
            barcode: itemBarcode2,
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          },
        ],
      }).then((specialInstanceIds) => {
        testData.instanceId = specialInstanceIds.instanceId;
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
    OtherSettings.setOtherSettingsViaApi({
      wildcardLookupEnabled: false,
    });
    // Check in item if it was checked out, ignore errors if item was not checked out
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemBarcode1,
      servicePointId: servicePoint.id,
      checkInDate: new Date().toISOString(),
    }).then(
      () => {},
      () => {},
    );
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode1);
    Users.deleteViaApi(userData.userId);
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C688738 Check fields without any information on the "Check out" app (vega)',
    { tags: ['extendedPath', 'vega', 'C688738'] },
    () => {
      // Step 1: Scan any user
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.waitForPatronSpinnerToDisappear();
      // Verify user scanned and user information is displayed
      CheckOutActions.checkUserInfo(userData);

      // Step 2: Enter a barcode value that would match for multiple results ("1" for example)
      CheckOutActions.checkOutItem(partialBarcode);

      // Verify "Select item" modal opened
      SelectItemModal.waitLoading();
      SelectItemModal.verifyModalTitle();
      // Verify "-" value displayed in "Call number" column
      SelectItemModal.verifyCallNumberColumn();
      SelectItemModal.verifyCallNumberValue(itemBarcode1, '-');
      SelectItemModal.verifyCallNumberValue(itemBarcode2, '-');

      // Additional verification: Select an item and verify successful checkout
      SelectItemModal.chooseItem(itemBarcode1);
      CheckOutActions.waitForItemSpinnerToDisappear();
      CheckOutActions.checkItemInfo(itemBarcode1, testData.instanceTitle);
    },
  );
});
