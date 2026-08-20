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
import { Organizations } from '../../../../support/fragments/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_TYPES,
  VENDOR_NAMES,
} from '../../../../support/constants';

const listName = `AT_C446061_List_${getRandomPostfix()}`;
const ediVendorType = '31B/US-SAN';
const testData = {
  organization: {},
  order: {},
  orderLine: {},
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
        'C446061 Vendor type can be selected independently in the UI (athena)',
        { tags: ['criticalPath', 'athena', 'C446061'] },
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

          // Step 3: Select "Vendor org — EDI vendor type" field
          QueryModal.selectField(purchaseOrderLinesFieldValues.vendorOrgEdiType);
          QueryModal.verifySelectedField(purchaseOrderLinesFieldValues.vendorOrgEdiType);
          QueryModal.verifyQueryAreaContent('(vendor_organization.edi_vendor_edi_type  )');

          // Step 4: Verify operators available for Vendor org — EDI vendor type field
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 5: Select "in" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyQueryAreaContent('(vendor_organization.edi_vendor_edi_type in ())');

          // Step 6: Select value from dropdown (pre-populated EDI vendor types)
          QueryModal.chooseFromValueMultiselect(ediVendorType);
          QueryModal.verifyQueryAreaContent(
            `(vendor_organization.edi_vendor_edi_type in [${ediVendorType}])`,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 7: Test query
          QueryModal.testQuery();

          // Step 8: Verify preview of found records and get count
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.testQueryDisabled(false);
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 9: Run query and save
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();

            // Step 10-12: Verify compilation complete
            Lists.verifyRefreshCompleteCallout(recordCount);
            Lists.waitForCompilingToComplete();
            Lists.verifyRecordsNumber(recordCount);
            Lists.verifyRecordWithContent(ediVendorType);

            const rowsToVerify = recordCount < 100 ? recordCount : 100;

            for (let i = 0; i < rowsToVerify; i++) {
              Lists.verifyResultCellContains(
                i,
                purchaseOrderLinesFieldValues.vendorOrgEdiType,
                ediVendorType,
              );
            }

            Lists.verifyQuery(`vendor_organization.edi_vendor_edi_type in [${ediVendorType}]`);
          });
        },
      );
    });
  });
});
