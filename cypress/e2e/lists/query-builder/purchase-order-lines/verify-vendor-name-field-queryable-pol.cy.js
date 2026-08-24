import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  purchaseOrderLinesFieldValues,
  QUERY_OPERATIONS,
  enumOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import SelectOrganizationModal from '../../../../support/fragments/orders/modals/selectOrganizationModal';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_TYPES } from '../../../../support/constants';

const listName = `AT_C446062_List_${getRandomPostfix()}`;
const testData = {
  organization: {
    ...NewOrganization.getDefaultOrganization(),
    name: `AT_C446062_VendorOrg_${getRandomPostfix()}`,
    code: `AT-C446062-${getRandomPostfix()}`,
    status: 'Active',
    isVendor: true,
  },
  order: {},
  orderLine: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Purchase order lines', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();

        // Create vendor organization
        Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
          testData.organization.id = organizationId;

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

              // Create order line
              const orderLine = BasicOrderLine.getDefaultOrderLine({
                purchaseOrderId: orderResponse.id,
                acquisitionMethod: acquisitionMethodId,
              });

              OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                testData.orderLine = orderLineResponse;
              });
            });
          });
        });

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
        if (testData.organization.id) {
          Organizations.deleteOrganizationViaApi(testData.organization.id, {
            failOnStatusCode: false,
          });
        }
        if (user?.userId) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C446062 Vendor Name can be selected independently in the UI (athena)',
        { tags: ['criticalPath', 'athena', 'C446062'] },
        () => {
          // Step 1: Create new list with Purchase order lines record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.purchaseOrderLines);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Build query
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 3: Select "Vendor org — Name" field
          QueryModal.selectField(purchaseOrderLinesFieldValues.vendorOrgName);
          QueryModal.verifySelectedField(purchaseOrderLinesFieldValues.vendorOrgName);
          QueryModal.verifyQueryAreaContent('');

          // Step 4: Verify operators available for Vendor org — Name field
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 5: Select "in" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyQueryAreaContent('(vendor_organization.name in ())');

          // Step 6: Select vendor name using organization lookup
          QueryModal.clickOrganizationLookup();
          SelectOrganizationModal.findOrganization(testData.organization.name);
          SelectOrganizationModal.selectOrganizations([testData.organization.name]);
          SelectOrganizationModal.save();
          QueryModal.verifyQueryAreaContent(
            `(vendor_organization.name in [${testData.organization.name}])`,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 7: Test query
          QueryModal.testQuery();

          // Step 8: Verify preview of found records
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled(false);

          // Step 9: Run query and save
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();

          // Step 10-12: Verify compilation complete
          Lists.verifyRefreshCompleteCallout(1);
          Lists.waitForCompilingToComplete();
          Lists.verifySingleRecordNumber();
          Lists.verifyRecordWithContent(testData.organization.name);
          Lists.verifyQuery(`vendor_organization.name in [${testData.organization.name}]`);
        },
      );
    });
  });
});
