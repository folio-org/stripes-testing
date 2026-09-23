import { APPLICATION_NAMES, ORDER_STATUSES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { NewOrder, OrderDetails, OrderLines, Orders } from '../../support/fragments/orders';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import InventoryInteractions from '../../support/fragments/settings/orders/inventoryInteractions';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix, { randomNDigitNumber } from '../../support/utils/stringTools';

describe('Orders', () => {
  const PRODUCT_ID_TYPE = 'ISSN';
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: NewOrder.getDefaultOrder({ vendorId: organization.id }),
    existingInstanceTitle: `AT_C895637_FolioInstance_${getRandomPostfix()}`,
    orderLineTitle: `AT_C895637_OrderLineTitle_${getRandomPostfix()}`,
    issn: `${randomNDigitNumber(4)}-${randomNDigitNumber(4)}`,
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization);
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });

    // Precondition 1: "Disable instance matching" is NOT active
    InventoryInteractions.getInstanceMatchingSettings().then((settings) => {
      if (settings?.length !== 0) {
        InventoryInteractions.setInstanceMatchingSetting({
          ...settings[0],
          value: JSON.stringify({ isInstanceMatchingDisabled: false }),
        });
      }
    });

    // Precondition 2: Instance NOT set for deletion with a valid and unique ISSN identifier
    cy.getProductIdTypes({ query: `name=="${PRODUCT_ID_TYPE}"` }).then((productIdType) => {
      testData.productIdTypeId = productIdType.id;

      InventoryInstances.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: testData.existingInstanceTitle,
            identifiers: [{ value: testData.issn, identifierTypeId: testData.productIdTypeId }],
          },
        }).then(({ instanceId }) => {
          testData.existingInstanceId = instanceId;
        });
      });
    });

    // Precondition 3: Order in "Pending" status without PO line
    Orders.createOrderViaApi(testData.order).then((orderResp) => {
      testData.order.id = orderResp.id;
      testData.orderNumber = orderResp.poNumber;
    });

    // Precondition 4: Authorized user with the required capabilities
    cy.createTempUser([
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.enableStaffSuppressFacet.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password);

      // Precondition 5: User is on "Orders" app with the search result for the order
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.searchByParameter('PO number', testData.orderNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.existingInstanceId);
    InventoryInstances.deleteInstanceByTitleViaApi(testData.orderLineTitle);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C895637 Instances not marked as "Set for Deletion" are included in the matching logic (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C895637'] },
    () => {
      // Step 1: Click on the "PO number" link on "Orders" pane for order from Preconditions
      Orders.selectFromResultsList(testData.orderNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Click "Actions" button in the "PO lines" accordion -> Select "Add PO line" option
      OrderLines.addPOLine();
      OrderLineEditForm.waitLoading();

      // Step 3: Fill in "Title" field and add "Product ID" with "Product ID type"
      OrderLineEditForm.fillItemDetails({ title: testData.orderLineTitle });
      OrderLineEditForm.addProductId({
        productId: testData.issn,
        productIdType: PRODUCT_ID_TYPE,
      });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.orderLineTitle } },
        { label: 'productId', conditions: { value: testData.issn } },
        { label: 'productIdType', conditions: { checkedOptionText: PRODUCT_ID_TYPE } },
      ]);

      // Step 4: Fill in all other mandatory fields -> Click "Save & close" button
      OrderLines.POLineInfoWithReceiptNotRequiredStatuswithSelectLocation(testData.location.name);
      OrderLines.submitOrderLine();
      InteractorsTools.checkCalloutMessage(OrderStates.orderLineCreatedSuccessfully);
      OrderLineDetails.waitLoading();

      // Step 5: Go back to the order, click "Actions" -> "Open" and submit the modal
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 6: Click on the PO line record in the "PO lines" accordion
      OrderLines.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkItemDetailsSection([{ key: 'Title', value: testData.orderLineTitle }]);
      OrderLineDetails.checkLinkedInstancesTableContent([
        { title: testData.existingInstanceTitle },
      ]);

      // Step 7: Click on the Title name in the "Item details" accordion
      OrderLines.openInstanceInPOL(testData.orderLineTitle);
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InventoryInstance.verifyInstanceTitle(testData.existingInstanceTitle);
      InstanceRecordView.verifyResourceIdentifier(PRODUCT_ID_TYPE, testData.issn, 0);
    },
  );
});
