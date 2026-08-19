import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  enumOperators,
  QUERY_OPERATIONS,
  purchaseOrderLinesFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C889719';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const testData = {
  polLocation: {},
  excludedLocation: {},
  organization: {},
  order: {},
  orderLine: {},
  acquisitionMethodId: '',
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Purchase order lines', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();
        Locations.getViaApiAnyDefault(2).then((fetchedLocations) => {
          testData.polLocation = fetchedLocations[0];
          testData.excludedLocation = fetchedLocations[1];

          cy.getAcquisitionMethodsApi({ query: 'value="Purchase"' }).then(
            (acquisitionMethodResponse) => {
              testData.acquisitionMethodId =
                acquisitionMethodResponse.body.acquisitionMethods[0].id;

              Organizations.createOrganizationViaApi(NewOrganization.getDefaultOrganization()).then(
                (organizationId) => {
                  testData.organization.id = organizationId;

                  const order = {
                    ...NewOrder.getDefaultOrder({ vendorId: organizationId }),
                    orderType: 'One-Time',
                    approved: false,
                    reEncumber: true,
                  };

                  Orders.createOrderViaApi(order).then((orderResponse) => {
                    testData.order = orderResponse;

                    const orderLine = BasicOrderLine.getDefaultOrderLine({
                      title: `AT_${testCaseId}_OrderLine_${getRandomPostfix()}`,
                      purchaseOrderId: orderResponse.id,
                      acquisitionMethod: testData.acquisitionMethodId,
                      specialLocationId: testData.polLocation.id,
                      quantity: 1,
                    });

                    OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                      testData.orderLine = orderLineResponse;
                    });
                  });
                },
              );
            },
          );
        });

        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.ordersStorageAcquisitionMethodsCollectionGet.gui,
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
        Users.deleteViaApi(user.userId);
      });

      it(
        'C889719 Locations are visible in POLs (Purchase order lines) (athena)',
        { tags: ['criticalPath', 'athena', 'C889719'] },
        () => {
          // Step 1: Click "New" button, add list name, select record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.purchaseOrderLines);
          Lists.verifySelectedOptionsInRecordTypeDropdown(Lists.recordTypes.purchaseOrderLines);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click "Build query" button
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();

          // Step 3: Select "POL — Locations — Code" field
          QueryModal.selectField(purchaseOrderLinesFieldValues.locationsCode);
          QueryModal.verifySelectedField(purchaseOrderLinesFieldValues.locationsCode);
          QueryModal.verifyOperatorColumn();

          // Step 4: Verify operators listed for this field
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 5: Select "NOT IN" operator
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_IN);

          // Step 6: Select the excluded location code and run test query
          QueryModal.chooseFromValueMultiselect(testData.excludedLocation.code);

          QueryModal.addNewRow();
          QueryModal.selectField(purchaseOrderLinesFieldValues.poNumber, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(testData.order.poNumber, 1);

          QueryModal.clickTestQuery();

          // Step 7: Verify preview with POL — Locations nested fields
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyPOLLocationsEmbeddedTableInQueryModal(testData.orderLine.id, {
            name: testData.polLocation.name,
            code: testData.polLocation.code,
            quantityElectronic: '',
            quantityPhysical: '1',
          });
        },
      );
    });
  });
});
