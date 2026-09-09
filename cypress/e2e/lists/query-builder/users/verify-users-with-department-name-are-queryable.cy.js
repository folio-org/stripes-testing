import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import Departments from '../../../../support/fragments/settings/users/departments';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1464068';
const listData = {
  name: `AT_${testCaseId}_List_${getRandomPostfix()}`,
  description: `AT_${testCaseId}_Desc_${getRandomPostfix()}`,
};
const departmentData = {
  name: `AT_${testCaseId}_Dept_${getRandomPostfix()}`,
  code: `AT_DEPT_${getRandomPostfix()}`,
};
let user;
let departmentId;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Users', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();
        Departments.createViaApi({ name: departmentData.name, code: departmentData.code }).then(
          (id) => {
            departmentId = id;

            cy.createTempUser([Permissions.listsAll.gui, Permissions.uiUsersView.gui]).then(
              (userProperties) => {
                user = userProperties;

                cy.assignDepartmentsToExistingUser(user.userId, [departmentId]);

                cy.login(user.username, user.password, {
                  path: TopMenu.listsPath,
                  waiter: Lists.waitLoading,
                });
              },
            );
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        Users.deleteViaApi(user.userId);
        Departments.deleteViaApi(departmentId);
      });

      it(
        'C1464068 Verify that the Users with "Department name" are queryable (athena)',
        { tags: ['extendedPath', 'athena', 'C1464068'] },
        () => {
          // Step 1: Create new list with Users record type and open Query Builder
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.users);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 2: Configure query: Department names equals department, click Test query
          QueryModal.selectField(usersFieldValues.userDepartmentNames);
          QueryModal.verifySelectedField(usersFieldValues.userDepartmentNames);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(departmentData.name);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled();
          QueryModal.clickTestQuery();
          QueryModal.testQueryDisabled();
          QueryModal.runQueryDisabled();

          // Step 3: Check preview of found records
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(false);
          QueryModal.verifyMatchedRecordsByIdentifier(
            user.barcode,
            usersFieldValues.userDepartmentNames,
            departmentData.name,
          );

          // Step 4: Click "Run query & save"
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);

            // Step 5: Verify result after refresh is done
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 6: Click "View updated list" link on the toast message
            Lists.viewUpdatedList();

            // Step 7: Click "Actions" and verify "Department names" column with correct value
            Lists.openActions();
            Lists.verifyCheckboxInShowColumnsChecked(usersFieldValues.userDepartmentNames, true);
            Lists.verifyResultCellByIdentifier(
              user.barcode,
              usersFieldValues.userDepartmentNames,
              departmentData.name,
            );
          });
        },
      );
    });
  });
});
