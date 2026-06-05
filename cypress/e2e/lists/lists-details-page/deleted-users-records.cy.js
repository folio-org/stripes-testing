import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists details page', () => {
    const deletedRecordTooltip =
      'This record has been deleted; refresh the list to remove it from the results.';
    const listData = {
      name: `C957375-${getTestEntityValue('list')}`,
      description: `C957375-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      status: 'Active',
      visibility: 'Shared',
    };
    const testData = {
      user: {},
      deletedUser: Users.generateUserModel(),
    };

    const deleteTestList = () => {
      cy.getUserToken(testData.user.username, testData.user.password);
      Lists.deleteListByNameViaApi(listData.name, true);
      cy.getAdminToken();
    };

    before('Create test data', () => {
      const uniqueUserName = getRandomPostfix();
      testData.deletedUser.personal.firstName = `DeletedFirst_${uniqueUserName}`;
      testData.deletedUser.personal.lastName = `DeletedLast_${uniqueUserName}`;

      cy.getAdminToken();
      cy.createTempUser([Permissions.listsAll.gui, Permissions.uiUsersView.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
        },
      );
      cy.createTempUserParameterized(testData.deletedUser, [], { userType: 'patron' }).then(
        (userProperties) => {
          testData.deletedUser = { ...testData.deletedUser, ...userProperties };
        },
      );
    });

    after('Delete test data', () => {
      deleteTestList();
      Users.deleteViaApi(testData.user.userId);
      Users.deleteViaApi(testData.deletedUser.userId);
    });

    it(
      'C957375 [Users] Deleted records are handled in Result Viewer (corsair)',
      { tags: ['criticalPath', 'corsair', 'C957375'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.description);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.buildQuery();

        QueryModal.selectField(usersFieldValues.firstName);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(testData.deletedUser.personal.firstName);
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.lastName, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.deletedUser.personal.lastName, 1);
        QueryModal.testQuery();
        QueryModal.verifyNumberOfRowsInPreviewTable(1);
        QueryModal.verifyRecordWithContent(testData.deletedUser.personal.firstName);
        QueryModal.verifyRecordWithContent(testData.deletedUser.personal.lastName);
        QueryModal.clickRunQueryAndSave();
        QueryModal.verifyClosed();
        Lists.waitForCompilingToComplete(3000);
        Lists.verifySingleRecordNumber();

        cy.getAdminToken();
        Users.deleteViaApi(testData.deletedUser.userId);
        Users.waitForUserDeletion({ id: testData.deletedUser.userId });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openList(listData.name);
        Lists.verifySingleRecordNumber();
        Lists.verifyResultCellContains(0, usersFieldValues.userActive, 'Deleted');
        [
          usersFieldValues.userBarcode,
          usersFieldValues.firstName,
          usersFieldValues.lastName,
          usersFieldValues.userName,
          usersFieldValues.patronGroup,
        ].forEach((columnName) => {
          Lists.verifyNoValueInResultCell(0, columnName);
        });
        Lists.verifyDeletedRecordTooltip(0, deletedRecordTooltip);

        Lists.openActions();
        Lists.selectResultColumn(usersFieldValues.userId);
        Lists.verifyResultCellContains(0, usersFieldValues.userId, testData.deletedUser.userId);
      },
    );
  });
});
