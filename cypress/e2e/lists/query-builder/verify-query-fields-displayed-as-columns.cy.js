import Permissions from '../../../support/dictionary/permissions';
import { ORDER_LINE_PAYMENT_STATUS } from '../../../support/constants';
import QueryModal, {
  QUERY_OPERATIONS,
  purchaseOrderLinesFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C466272_List_${getRandomPostfix()}`;
const testData = {
  organization: {},
  order: {},
  orderLine: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.getAdminToken();

      cy.getAcquisitionMethodsApi({ query: 'value="Purchase"' }).then(
        (acquisitionMethodResponse) => {
          testData.acquisitionMethodId = acquisitionMethodResponse.body.acquisitionMethods[0].id;

          Organizations.createOrganizationViaApi(NewOrganization.getDefaultOrganization()).then(
            (organizationResponse) => {
              testData.organization.id = organizationResponse;

              const order = {
                ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                orderType: 'One-Time',
                approved: false,
                reEncumber: true,
              };

              Orders.createOrderViaApi(order).then((orderResponse) => {
                testData.order = orderResponse;

                // Create order line (will have default 'Pending' payment status)
                const orderLine = BasicOrderLine.getDefaultOrderLine({
                  purchaseOrderId: orderResponse.id,
                  listUnitPrice: 50.0,
                  acquisitionMethod: testData.acquisitionMethodId,
                });

                OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                  testData.orderLine = orderLineResponse;
                });
              });
            },
          );
        },
      );

      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsView.gui,
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
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Lists.deleteListByNameViaApi(listName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466272 [Query Builder] Newly added fields that are part of the query are automatically displayed as columns (corsair)',
      { tags: ['criticalPath', 'corsair', 'C466272'] },
      () => {
        // Step 1: Create new list with Purchase order lines record type and build query
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.purchaseOrderLines);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Select "POL — Payment status" field with "not equal to" operator
        QueryModal.selectField(purchaseOrderLinesFieldValues.poNumber);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.fillInValueTextfield('non-existent-value');
        QueryModal.addNewRow();
        QueryModal.selectField(purchaseOrderLinesFieldValues.poNumber, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
        QueryModal.fillInValueTextfield(testData.order.poNumber, 1);
        QueryModal.testQuery();

        // Step 3: Verify preview of matched records and both columns are displayed
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyColumnDisplayed(purchaseOrderLinesFieldValues.poNumber);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.order.poNumber,
          purchaseOrderLinesFieldValues.poNumber,
          testData.order.poNumber,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 4: Run query and save - verify list is saved
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();

        // Step 5: View updated list - verify record table is displayed
        Lists.verifyRefreshCompleteCallout(1);
        Lists.viewUpdatedList();

        // Step 6: Edit query - go to Actions > Edit list > Edit query
        Lists.openActions();
        Lists.editList();
        Lists.editQuery();
        QueryModal.exists();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled();
        QueryModal.xButttonDisabled(false);
        QueryModal.verifySelectedField(purchaseOrderLinesFieldValues.poNumber);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.verifySelectedField(purchaseOrderLinesFieldValues.poNumber, 1);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.START_WITH, 1);

        // Step 7: Add new row with "+" button and verify new row elements
        QueryModal.addNewRow(1);
        QueryModal.verifyBooleanColumn(2);
        QueryModal.verifyValueInBooleanColumn('AND', 2);
        QueryModal.verifySelectedField('Select field', 2);
        QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
        QueryModal.verifyPlusAndTrashButtonsDisabled(2, false, false);
        QueryModal.verifyQueryAreaContent(
          `(po.po_number != non-existent-value) AND (po.po_number starts with ${testData.order.poNumber}) AND (  )`,
        );
        QueryModal.testQueryDisabled(true);
        QueryModal.runQueryDisabled(true);

        // Step 8: Select "POL — Title" field with "contains" operator
        QueryModal.selectField(purchaseOrderLinesFieldValues.paymentStatus, 2);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 2);
        QueryModal.selectValueFromSelect(ORDER_LINE_PAYMENT_STATUS.PARTIALLY_PAID, 2);
        QueryModal.testQuery();

        // Step 9: Verify preview and all columns are automatically displayed
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.order.poNumber,
          purchaseOrderLinesFieldValues.paymentStatus,
          ORDER_LINE_PAYMENT_STATUS.PENDING,
        );
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.order.poNumber,
          purchaseOrderLinesFieldValues.poNumber,
          testData.order.poNumber,
        );
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);
      },
    );
  });
});
