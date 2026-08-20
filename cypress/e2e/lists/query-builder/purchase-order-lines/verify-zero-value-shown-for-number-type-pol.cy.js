import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  purchaseOrderLinesFieldValues,
  QUERY_OPERATIONS,
  dateTimeOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import { Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_TYPES,
  VENDOR_NAMES,
} from '../../../../support/constants';

const listName = `AT_C451531_List_${getRandomPostfix()}`;
const testData = {
  organization: {},
  order: {},
  orderLineWithZeroCost: {},
  orderLineWithNonZeroCost: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Purchase order lines', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        // Get existing vendor organization
        Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
          (organization) => {
            testData.organization = organization;

            // Get acquisition method
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
            }).then((acquisitionMethodResponse) => {
              const acquisitionMethodId = acquisitionMethodResponse.body.acquisitionMethods[0].id;

              // Create order with vendor
              const order = {
                ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                orderType: ORDER_TYPES.ONE_TIME_API,
                approved: false,
              };

              Orders.createOrderViaApi(order).then((orderResponse) => {
                testData.order = orderResponse;

                // Create order line with cost = 0
                const orderLineWithZero = BasicOrderLine.getDefaultOrderLine({
                  purchaseOrderId: orderResponse.id,
                  acquisitionMethod: acquisitionMethodId,
                  listUnitPrice: 0,
                  quantity: 1,
                });

                OrderLines.createOrderLineViaApi(orderLineWithZero).then((orderLineResponse) => {
                  testData.orderLineWithZeroCost = orderLineResponse;
                });

                // Create order line with cost > 0 and < 110
                const orderLineWithNonZero = BasicOrderLine.getDefaultOrderLine({
                  purchaseOrderId: orderResponse.id,
                  acquisitionMethod: acquisitionMethodId,
                  listUnitPrice: 50,
                  quantity: 1,
                });

                OrderLines.createOrderLineViaApi(orderLineWithNonZero).then((orderLineResponse) => {
                  testData.orderLineWithNonZeroCost = orderLineResponse;
                });
              });
            });
          },
        );

        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName);
        if (testData.order.id) {
          Orders.deleteOrderViaApi(testData.order.id);
        }
        if (user?.userId) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C451531 Verify that the results viewer shows the 0 value for number type (athena)',
        { tags: ['criticalPath', 'athena', 'C451531'] },
        () => {
          // Step 1: Create new list with Purchase order lines and build query
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.purchaseOrderLines);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 2: Select "POL — Cost PO line estimated price" field
          QueryModal.selectField(purchaseOrderLinesFieldValues.costPOLEstimatedPrice);
          QueryModal.verifySelectedField(purchaseOrderLinesFieldValues.costPOLEstimatedPrice);

          // Step 3: Select "< (less than)" operator
          QueryModal.verifyOperatorsList(dateTimeOperators);
          QueryModal.selectOperator(QUERY_OPERATIONS.LESS_THAN);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.LESS_THAN);

          // Step 4: Enter value '110' and add UUID filter
          QueryModal.fillInValueTextfield('110');
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Add second filter row for POL UUID to narrow results to created order lines
          QueryModal.addNewRow();
          QueryModal.selectField(purchaseOrderLinesFieldValues.uuid, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.fillInValueTextfield(
            `${testData.orderLineWithZeroCost.id},${testData.orderLineWithNonZeroCost.id}`,
            1,
          );

          // Step 5: Test query
          QueryModal.testQuery();

          // Step 6: Verify preview of matched records
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled(false);

          // Step 7: Show "POL — Cost PO line estimated price" column and verify values
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.orderLineWithZeroCost.poLineNumber,
            purchaseOrderLinesFieldValues.costPOLEstimatedPrice,
            '0',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.orderLineWithNonZeroCost.poLineNumber,
            purchaseOrderLinesFieldValues.costPOLEstimatedPrice,
            '50',
          );
        },
      );
    });
  });
});
