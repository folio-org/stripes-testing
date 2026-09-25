import { APPLICATION_NAMES, ORDER_STATUSES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { NewOrder, OrderDetails, OrderLines, Orders } from '../../support/fragments/orders';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix, { randomNDigitNumber } from '../../support/utils/stringTools';

describe('Orders', () => {
  const OCLC = 'OCLC';
  const ISBN = 'ISBN';
  const INSTANCE_PUBLICATION_DATE = '2020';
  const POL_PUBLICATION_DATE = '2024';
  const POL_LIMIT = 3;
  let testData;

  before('Create test data', () => {
    const organization = NewOrganization.getDefaultOrganization();
    testData = {
      organization,
      order: NewOrder.getDefaultOrder({ vendorId: organization.id }),
      instanceTitle: `AT_C784496_FolioInstance_${getRandomPostfix()}`,
      orderLineTitle: `AT_C784496_OrderLineInstance_${getRandomPostfix()}`,
      instanceOclc: `${randomNDigitNumber(8)}`,
      orderLineOclc: `${randomNDigitNumber(8)}`,
      orderLineUpdatedOclc: `${randomNDigitNumber(8)}`,
      orderLineIsbn: `9781${randomNDigitNumber(9)}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });

    // Precondition 1: "Set purchase order lines limit" is set to more than "2"
    OrderLinesLimit.setPOLLimitViaApi(POL_LIMIT);

    // Precondition 2: Instance with OCLC product identifier and only Publication date specified
    cy.getProductIdTypes({ query: `name=="${OCLC}"` }).then((productIdType) => {
      InventoryInstances.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: testData.instanceTitle,
            identifiers: [{ value: testData.instanceOclc, identifierTypeId: productIdType.id }],
            publication: [{ dateOfPublication: INSTANCE_PUBLICATION_DATE }],
          },
        }).then(({ instanceId }) => {
          testData.instanceId = instanceId;
        });
      });
    });

    // Precondition 3: Order in "Pending" status without PO line
    Orders.createOrderViaApi(testData.order).then((orderResp) => {
      testData.order.id = orderResp.id;
      testData.orderNumber = orderResp.poNumber;
    });

    // Precondition 4: User with the required capabilities
    cy.createTempUser([
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiInventoryViewInstances.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 5: User is on "Orders" app with the search result for the order
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.orderNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    OrderLinesLimit.setPOLLimitViaApi(1);
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLineTitle);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C784496 Create an order with a title that has an "OCLC" identifier and a specified publication date (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C784496', 'nonParallel'] },
    () => {
      // Step 1: Click on "PO number" link on "Orders" pane for order from Preconditions
      Orders.selectFromResultsList(testData.orderNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Click "Actions" button in the "PO lines" accordion -> Select "Add PO line" option
      OrderLines.addPOLine();
      OrderLineEditForm.waitLoading();

      // Step 3: Click "Title look-up", search for the Instance from Preconditions and select it
      OrderLineEditForm.fillItemDetailsTitle({ instanceTitle: testData.instanceTitle });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.instanceTitle } },
        { label: 'publicationDate', conditions: { value: INSTANCE_PUBLICATION_DATE } },
        { label: 'productId', conditions: { value: testData.instanceOclc } },
        { label: 'productIdType', conditions: { checkedOptionText: OCLC } },
      ]);

      // Step 4: Fill in all other mandatory fields -> Click "Save & close" button
      OrderLines.POLineInfoWithReceiptNotRequiredStatus(testData.location.name);
      InteractorsTools.checkCalloutMessage(OrderStates.orderLineCreatedSuccessfully);
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({ productId: testData.instanceOclc, productIdType: OCLC });
      OrderLineDetails.checkLinkedInstancesTableContent([
        { title: testData.instanceTitle, publisher: INSTANCE_PUBLICATION_DATE },
      ]);

      // Step 5: Click back arrow -> Click "Actions" in the "PO lines" accordion -> "Add PO line"
      OrderLines.backToEditingOrder();
      OrderLines.addPOLine();
      OrderLineEditForm.waitLoading();

      // Step 6: Fill in "Title", "Publication date" and add "Product ID" with "OCLC" type
      OrderLineEditForm.fillItemDetails({
        title: testData.orderLineTitle,
        publicationDate: POL_PUBLICATION_DATE,
      });
      OrderLineEditForm.addProductId({
        productId: testData.orderLineOclc,
        productIdType: OCLC,
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.orderLineTitle } },
        { label: 'publicationDate', conditions: { value: POL_PUBLICATION_DATE } },
        { label: 'productId', conditions: { value: testData.orderLineOclc } },
        { label: 'productIdType', conditions: { checkedOptionText: OCLC } },
      ]);

      // Step 7: Fill in all other mandatory fields -> Click "Save & close" button
      OrderLines.POLineInfoWithReceiptNotRequiredStatuswithSelectLocation(testData.location.name);
      OrderLines.submitOrderLine();
      InteractorsTools.checkCalloutMessage(OrderStates.orderLineCreatedSuccessfully);
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({
        productId: testData.orderLineOclc,
        productIdType: OCLC,
      });

      // Step 8: Click "Actions" button on the "PO Line details" pane -> Select "Edit" option
      OrderLines.editPOLInOrder();
      OrderLineEditForm.waitLoading();

      // Step 9: Edit "OCLC" Product ID, add "ISBN" product identifier -> Click "Save & close"
      OrderLineEditForm.fillItemDetails({ productId: testData.orderLineUpdatedOclc });
      OrderLineEditForm.addProductId({
        productId: testData.orderLineIsbn,
        productIdType: ISBN,
        index: 1,
      });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({
        productId: testData.orderLineUpdatedOclc,
        productIdType: OCLC,
      });
      OrderLines.verifyProductIdentifier(
        { productId: testData.orderLineIsbn, productIdType: ISBN },
        1,
      );

      // Step 10: Click back arrow -> Click "Actions" on "Purchase order" pane -> "Open" -> "Submit"
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderLineInTableByIdentifier(`${testData.orderNumber}-1`, [
        { columnName: 'Product ID', value: testData.instanceOclc },
      ]);
      OrderDetails.checkOrderLineInTableByIdentifier(`${testData.orderNumber}-2`, [
        { columnName: 'Product ID', value: testData.orderLineUpdatedOclc },
        { columnName: 'Product ID', value: testData.orderLineIsbn },
      ]);

      // Step 11: Click on the PO line #1 record in the "PO lines" accordion
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({ productId: testData.instanceOclc, productIdType: OCLC });
      OrderLineDetails.checkLinkedInstancesTableContent([
        { title: testData.instanceTitle, publisher: INSTANCE_PUBLICATION_DATE },
      ]);

      // Step 12: Click back arrow -> Click on the PO line #2 record in the "PO lines" accordion
      OrderLines.backToEditingOrder();
      OrderLines.selectPOLInOrder(1);
      OrderLineDetails.waitLoading();
      OrderLines.verifyProductIdentifier({
        productId: testData.orderLineUpdatedOclc,
        productIdType: OCLC,
      });
      OrderLines.verifyProductIdentifier(
        { productId: testData.orderLineIsbn, productIdType: ISBN },
        1,
      );
      OrderLineDetails.checkLinkedInstancesTableContent([
        { title: testData.orderLineTitle, publisher: POL_PUBLICATION_DATE },
      ]);

      // Step 13: Click on the Title name in the "Item details" accordion
      OrderLines.openInstanceInPOL(testData.orderLineTitle);
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.verifyResourceIdentifier(OCLC, testData.orderLineUpdatedOclc, 1);
      InstanceRecordView.verifyResourceIdentifier(ISBN, testData.orderLineIsbn, 0);

      // Step 14: Go to "Orders" app -> "Order lines" -> search by "Product ID" for each identifier
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrderLines();
      OrderLines.resetFiltersIfActive();
      [
        { productId: testData.instanceOclc, poLineNumber: `${testData.orderNumber}-1` },
        { productId: testData.orderLineUpdatedOclc, poLineNumber: `${testData.orderNumber}-2` },
        { productId: testData.orderLineIsbn, poLineNumber: `${testData.orderNumber}-2` },
      ].forEach(({ productId, poLineNumber }) => {
        OrderLines.searchByParameter('Product ID', productId);
        OrderLines.checkOrderlineSearchResults({ poLineNumber });
      });
    },
  );
});
