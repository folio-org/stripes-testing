import Permissions from '../../../support/dictionary/permissions';
import QueryModal, { QUERY_OPERATIONS } from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder UI', () => {
    let userData = {};
    let listName;

    const openQueryBuilder = (recordType) => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      // cy.loginAsAdmin({ path: TopMenu.listsPath, waiter: Lists.waitLoading });
      Lists.openNewListPane();
      Lists.setName(listName);
      Lists.selectRecordType(recordType);
      Lists.buildQuery();
    };

    const verifyQueryBuilder = (
      field,
      operator,
      filedType,
      value,
      query,
      locator,
      valueInColumn,
    ) => {
      QueryModal.selectField(field);
      QueryModal.selectOperator(operator);
      QueryModal.populateFiled(filedType, value);
      QueryModal.testQuery();
      cy.wait(2000); // wait for query to process
      Lists.verifyQueryHeader(field);
      Lists.verifyQueryValue(value, operator, locator, valueInColumn);
      Lists.verifyPreviewOfRecordsMatched();
      QueryModal.clickRunQueryAndSave();
      QueryModal.verifyClosed();
      Lists.waitForCompilingToComplete(3000);
      Lists.verifyQuery(query);
      Lists.verifyQueryHeader(field);
      Lists.verifyQueryValue(value, operator, locator, valueInColumn);
      Lists.closeListDetailsPane();
    };

    describe('Organizations', () => {
      const recordType = 'Organizations';
      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]).then((userProperties) => {
          userData = userProperties;
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      afterEach('Delete test list', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName, true);
      });

      it(
        'C451507 Search for "organizations" in the query builder using "Status" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451507'] },
        () => {
          listName = getTestEntityValue('C451507_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'Organization — Status',
            QUERY_OPERATIONS.EQUAL,
            'select',
            'Active',
            'organization.status == Active',
            'list-column-organization.status',
          );
        },
      );
    });

    describe('Purchase order lines', () => {
      const recordType = 'Purchase order lines';

      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.listsAll.gui,
          // Permissions.usersViewRequests.gui,
          Permissions.uiOrdersCreate.gui,
          // Permissions.inventoryAll.gui,
          // Permissions.loansAll.gui,
          // Permissions.uiOrganizationsViewEditCreate.gui,
        ]).then((userProperties) => {
          userData = userProperties;
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      afterEach('Delete test list', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName, true);
      });

      it(
        'C451553 Verify that grouped fields display within a list row for "POL — Fund distribution" column (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451553'] },
        () => {
          listName = getTestEntityValue('C451553_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'POL — UUID',
            QUERY_OPERATIONS.NOT_IN,
            'input',
            'test',
            'pol.id not in test',
            'list-column-pol.id',
          );
        },
      );
    });

    describe('Users', () => {
      const recordType = 'Users';

      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui]).then(
          (userProperties) => {
            userData = userProperties;
          },
        );
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      afterEach('Delete test list', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName, true);
      });

      it(
        'C451548 Verify the operator null/empty with "True" value (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451548'] },
        () => {
          listName = getTestEntityValue('C451548_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'User — Middle name',
            QUERY_OPERATIONS.IS_NULL,
            'select',
            'True',
            'users.middle_name is null/empty true',
            'list-column-users.middle_name',
            '',
          );
        },
      );
    });

    describe('Instances', () => {
      const recordType = 'Instances';

      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]).then(
          (userProperties) => {
            userData = userProperties;
          },
        );
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      afterEach('Delete test list', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName, true);
      });

      it(
        'C451549 Verify the operator null/empty with "False" value (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451549'] },
        () => {
          listName = getTestEntityValue('C451549_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'Instance — Suppress from discovery',
            QUERY_OPERATIONS.IS_NULL,
            'select',
            'False',
            'instance.discovery_suppress is null/empty false',
            'list-column-instance.discovery_suppress',
            'False',
          );
        },
      );
    });
  });
});
