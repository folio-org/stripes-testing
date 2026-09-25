import { COMMON_BUTTON_LABELS, ORDER_STATUSES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { NewOrder, OrderDetails, OrderLines, Orders } from '../../support/fragments/orders';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const PRODUCT_ID_TYPE = 'ISBN';
  const INVALID_PRODUCT_ID = 'AB876';
  const ISBN_10 = '1631492225';
  const INVALID_ISBN_MESSAGE = 'Invalid ISBN';
  let testData;

  before('Create test data', () => {
    const organization = NewOrganization.getDefaultOrganization();
    testData = {
      organization,
      order: NewOrder.getDefaultOrder({ vendorId: organization.id }),
      orderLineTitle: `AT_C656273_OrderLineInstance_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });

    // Precondition 1: Order for an organization-vendor without PO lines
    Orders.createOrderViaApi(testData.order).then((orderResp) => {
      testData.order.id = orderResp.id;
      testData.orderNumber = orderResp.poNumber;
    });

    // Precondition 3: User with the required capabilities
    cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        // Precondition 4: User is in the Orders app
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    InventoryInstances.deleteInstanceByTitleViaApi(testData.orderLineTitle);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C656273 Product ID is not validated if the Product ID type is ISBN in PO lines (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C656273'] },
    () => {
      // Step 1: Search for the Order and click on the Order's number
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Click "Actions" in the "PO lines" accordion -> Select "Add PO line"
      OrderLines.addPOLine();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 3: Fill in the "Title" field
      OrderLineEditForm.fillItemDetails({ title: testData.orderLineTitle });

      // Step 4-5: Click "Add product ID and product ID type", select "ISBN" type and enter non-ISBN Product ID
      OrderLineEditForm.addProductId({
        productId: INVALID_PRODUCT_ID,
        productIdType: PRODUCT_ID_TYPE,
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.orderLineTitle } },
        { label: 'productId', conditions: { value: INVALID_PRODUCT_ID, required: true } },
        {
          label: 'productIdType',
          conditions: { checkedOptionText: PRODUCT_ID_TYPE, required: true },
        },
      ]);

      // Step 3, 5: Fill in the other required fields and click "Save & close"
      OrderLines.POLineInfoWithReceiptNotRequiredStatuswithSelectLocation(testData.location.name);
      OrderLines.submitOrderLine();
      InteractorsTools.checkCalloutMessage(OrderStates.orderLineCreatedSuccessfully);
      OrderLineDetails.waitLoading();

      // Step 6: Verify the "Product identifiers" field in the "Item details" accordion
      OrderLines.verifyProductIdentifier({
        productId: INVALID_PRODUCT_ID,
        qualifier: '',
        productIdType: PRODUCT_ID_TYPE,
      });
      OrderLines.verifyTextAbsentInItemDetails(INVALID_ISBN_MESSAGE);

      // Step 7: Edit PO line, replace Product ID with ISBN-10 code and click "Save & close"
      OrderLines.editPOLInOrder();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.fillItemDetails({ productId: ISBN_10 });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({
        productId: ISBN_10,
        qualifier: '',
        productIdType: PRODUCT_ID_TYPE,
      });
      OrderLines.verifyTextAbsentInItemDetails(INVALID_ISBN_MESSAGE);

      // Step 8: Go back to the order, click "Actions" -> "Open" and submit the modal
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 9: Click on the PO line record in the "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({
        productId: ISBN_10,
        qualifier: '',
        productIdType: PRODUCT_ID_TYPE,
      });
      OrderLines.verifyTextAbsentInItemDetails(INVALID_ISBN_MESSAGE);
    },
  );
});
