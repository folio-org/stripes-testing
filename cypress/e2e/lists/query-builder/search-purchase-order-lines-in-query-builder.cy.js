import Permissions from '../../../support/dictionary/permissions';
import QueryModal, { QUERY_OPERATIONS } from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder', () => {
    let userData = {};
    let listName;

    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.loansAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    const testData = [
      {
        testCaseId: 'C436901',
        recordType: 'Purchase order lines',
        field: 'PO — Order type',
        operator: QUERY_OPERATIONS.EQUAL,
        filedType: 'select',
        value: 'Ongoing',
        query: 'po.order_type == Ongoing',
      },
      {
        testCaseId: 'C440056',
        recordType: 'Purchase order lines',
        field: 'PO — Approved',
        operator: QUERY_OPERATIONS.EQUAL,
        filedType: 'select',
        value: 'False',
        query: 'po.approved == False',
      },
      {
        testCaseId: 'C440058',
        recordType: 'Purchase order lines',
        field: 'POL — Cost PO line estimated price',
        operator: QUERY_OPERATIONS.GREATER_THAN_OR_EQUAL_TO,
        filedType: 'input',
        value: '10',
        query: 'pol.cost_po_line_estimated_price >= 10',
      },
      {
        testCaseId: 'C442845',
        recordType: 'Purchase order lines',
        field: 'POL exchange rate',
        operator: QUERY_OPERATIONS.GREATER_THAN,
        filedType: 'input',
        value: '0',
        query: 'pol_exchange_rate > 0',
      },
      {
        testCaseId: 'C442846',
        recordType: 'Purchase order lines',
        field: 'PO — PO number',
        operator: QUERY_OPERATIONS.CONTAINS,
        filedType: 'input',
        value: '1',
        query: 'po.po_number contains 1',
      },
      {
        testCaseId: 'C442847',
        recordType: 'Purchase order lines',
        field: 'POL — Payment status',
        operator: QUERY_OPERATIONS.EQUAL,
        filedType: 'select',
        value: 'Pending',
        query: 'pol.payment_status == Pending',
      },
      {
        testCaseId: 'C442848',
        recordType: 'Purchase order lines',
        field: 'PO — Updated at',
        operator: QUERY_OPERATIONS.LESS_THAN,
        filedType: 'input',
        value: '12/12/2050',
        query: 'po.updated_at < 12/12/2050',
      },
      {
        testCaseId: 'C451553',
        recordType: 'Purchase order lines',
        field: 'POL — UUID',
        operator: QUERY_OPERATIONS.NOT_IN,
        filedType: 'input',
        value: 'test',
        query: 'pol.id not in test',
      },
    ];

    testData.forEach((data) => {
      describe('Purchase order lines', () => {
        before('Create list', () => {
          listName = getTestEntityValue(`${data.testCaseId}_List`);
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(data.recordType);
          Lists.buildQuery();
        });

        after('Delete list', () => {
          cy.getUserToken(userData.username, userData.password);
          Lists.deleteListByNameViaApi(listName, true);
        });

        it(
          `${data.testCaseId} Search purchase order lines in the Query Builder (corsair)`,
          { tags: ['criticalPath', 'corsair'] },
          () => {
            QueryModal.selectField(data.field);
            QueryModal.selectOperator(data.operator);
            QueryModal.populateFiled(data.filedType, data.value);
            QueryModal.testQuery();
            Lists.verifyQueryHeader(data.field);
            Lists.verifyQueryValue(data.value, data.operator);
            Lists.verifyPreviewOfRecordsMatched();
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.waitForCompilingToComplete();
            Lists.verifyQuery(data.query);
            Lists.verifyQueryHeader(data.field);
            Lists.verifyQueryValue(data.value, data.operator);
            Lists.closeListDetailsPane();
          },
        );
      });
    });
  });
});
