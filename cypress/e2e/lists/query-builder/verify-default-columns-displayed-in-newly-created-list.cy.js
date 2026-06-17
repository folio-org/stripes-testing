import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import ListsFile, { usersCsvHeaders } from '../../../support/fragments/lists/lists-file';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C436809_List_${getRandomPostfix()}`;
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.createTempUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listName);
      Users.deleteViaApi(user.userId);
      Lists.deleteDownloadedFile(listName);
    });

    it(
      'C436809 Verify that default columns for entity type are displayed in newly created list (corsair)',
      { tags: ['extendedPath', 'corsair', 'C436809'] },
      () => {
        // Step 1: Create new list
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Click on "Select field" dropdown, select the field - "User — Active"
        QueryModal.selectField(usersFieldValues.userActive);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.userBarcode, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(user.barcode, 1);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 3: Check the preview of found records
        const defaultUsersColumns = [
          usersFieldValues.patronGroup,
          usersFieldValues.userActive,
          usersFieldValues.userBarcode,
          usersFieldValues.firstName,
          usersFieldValues.lastName,
          usersFieldValues.userName,
        ];

        defaultUsersColumns.forEach((column) => {
          QueryModal.verifyColumnDisplayed(column);
        });

        // Step 4: Click on "Run query & save" button
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();
        Lists.waitForCompilingAnimationToDisappear();

        // Step 5: Click on "View updated list" in the toast message after finishing list compiling process
        Lists.verifyRefreshCompleteCallout(1);
        Lists.viewUpdatedList();

        defaultUsersColumns.forEach((column) => {
          QueryModal.verifyColumnDisplayed(column);
        });

        // Step 6: Click on "Action' => activate all checkboxes
        Lists.openActions();

        Lists.userColumns.forEach((column) => {
          Lists.selectResultColumn(column);
        });

        Lists.exportList();
        Lists.verifyCalloutMessage(
          `Export of ${listName} is being generated. This may take some time for larger lists.`,
        );
        Lists.verifyCalloutMessage(`List ${listName} was successfully exported to CSV.`);

        const expectedColumns = Lists.userColumns.map((column) => column.replace('—', '-'));

        Lists.checkDownloadedFileArray(listName, expectedColumns);
        ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
          listName,
          usersCsvHeaders.userBarcode,
          user.barcode,
          [
            {
              header: usersCsvHeaders.userBarcode,
              value: user.barcode,
            },
            {
              header: usersCsvHeaders.userActive,
              value: true,
            },
            {
              header: usersCsvHeaders.firstName,
              value: user.firstName,
            },
            {
              header: usersCsvHeaders.lastName,
              value: user.lastName,
            },
            {
              header: usersCsvHeaders.userName,
              value: user.username,
            },
            {
              header: usersCsvHeaders.patronGroup,
              value: user.userGroup.group,
            },
            {
              header: usersCsvHeaders.userEmail,
              value: user.personal.email,
            },
            {
              header: usersCsvHeaders.userAddress,
              value: '',
            },
            {
              header: usersCsvHeaders.middleName,
              value: user.personal.middleName,
            },
          ],
        );
      },
    );
  });
});
