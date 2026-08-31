import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
  organizationFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import SelectOrganizationModal from '../../../support/fragments/orders/modals/selectOrganizationModal';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const testCaseId = 'C688802';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;
const orderLineTitle = `AT_${testCaseId}_OrderLine_${getRandomPostfix()}`;
const otherOrgUuid = uuid();
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

          const defaultOrg = NewOrganization.getDefaultOrganization();
          testData.organization = { ...defaultOrg };

          Organizations.createOrganizationViaApi(defaultOrg).then((organizationId) => {
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
                title: orderLineTitle,
                purchaseOrderId: orderResponse.id,
                acquisitionMethod: testData.acquisitionMethodId,
              });

              OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                testData.orderLine = orderLineResponse;
              });
            });
          });
        },
      );

      cy.createTempUser([
        Permissions.listsEdit.gui,
        Permissions.uiInventoryViewInstances.gui,
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
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Lists.deleteListByNameViaApi(listName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C688802 Search for "Purchase order lines with titles" in the query builder using the fields "Instance — Languages", "Organization — Code", "Organization — UUID" (athena)',
      { tags: ['extendedPath', 'athena', 'C688802'] },
      () => {
        // Step 1: Create new list with 'Purchase order lines with titles' record type
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType('Purchase order lines with titles');
        Lists.verifySaveButtonIsActive();
        Lists.verifyCancelButtonIsActive();

        // Step 2: Open Build query form and verify initial state
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();

        // Step 3: Select "Instance — Languages" field
        QueryModal.selectField(instanceFieldValues.languages);
        QueryModal.verifySelectedField(instanceFieldValues.languages);
        QueryModal.verifyOperatorColumn();

        // Step 4: Select "not contains all" operator
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_IN);

        // Step 5: Select a language value and verify "Test query" becomes active
        QueryModal.chooseFromValueMultiselect('English', 0, { exactMatch: true });
        QueryModal.testQueryDisabled(false);

        // Step 6: Run first test query and verify results
        QueryModal.testQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();

        // Step 7: Add second row and verify new row structure
        QueryModal.addNewRow();
        QueryModal.verifyBooleanColumn(1);
        QueryModal.verifyEmptyField(1);
        QueryModal.verifyEmptyOperator(1);
        QueryModal.verifyEmptyValue(1);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();

        // Step 8: Select "Organization — Code" field in row 2
        QueryModal.selectField(organizationFieldValues.code, 1);
        QueryModal.verifySelectedField(organizationFieldValues.code, 1);
        QueryModal.verifyOperatorColumn();

        // Step 9: Select "equals" operator in row 2
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);

        // Step 10: Enter organization code value in row 2 and verify "Test query" active
        QueryModal.clickOrganizationLookup(1);
        SelectOrganizationModal.verifyModalView();
        SelectOrganizationModal.findOrganization(testData.organization.code);
        SelectOrganizationModal.verifyClosed();
        QueryModal.testQueryDisabled(false);

        // Step 11: Run second test query and verify results
        QueryModal.testQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.organization.code,
          organizationFieldValues.code,
          testData.organization.code,
        );

        // Step 12: Add third row
        QueryModal.addNewRow(1);
        QueryModal.verifyBooleanColumn(2);
        QueryModal.verifyEmptyField(2);
        QueryModal.testQueryDisabled();
        QueryModal.runQueryDisabled();

        // Step 13: Select "Organization — UUID" field in row 3
        QueryModal.selectField(organizationFieldValues.uuid, 2);
        QueryModal.verifySelectedField(organizationFieldValues.uuid, 2);
        QueryModal.verifyOperatorColumn();

        // Step 14: Select "NOT IN" operator in row 3
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 2);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_IN, 2);

        // Step 15: Enter a dummy UUID value in row 3 (org is NOT excluded so POL appears in results)
        QueryModal.fillInValueTextfield(otherOrgUuid, 2);
        QueryModal.testQueryDisabled(false);

        // Step 16: Run test query and verify in-progress state
        QueryModal.clickTestQuery();

        // Step 17: Verify preview of matched records and our POL's column values
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.organization.code,
          organizationFieldValues.uuid,
          testData.organization.id,
        );

        // Steps 18–19: Capture record count, run query & save, verify callouts
        QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);
          Lists.waitForCompilingAnimationToDisappear();
          Lists.verifyRefreshCompleteCallout(recordCount);
        });
      },
    );
  });
});
