import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  usersFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C740218_List_${getRandomPostfix()}`;
const usernamePrefix = 'AT_C740218_';
const testData = {
  userWithBarcode: {
    username: `${usernamePrefix}WithBarcode_${getRandomPostfix()}`,
    barcode: getRandomPostfix(),
  },
  userWithoutBarcode: {
    username: `${usernamePrefix}NoBarcode_${getRandomPostfix()}`,
  },
  queryValue: 'test123',
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        // Create user WITH barcode
        cy.createTempUserParameterized(
          {
            username: testData.userWithBarcode.username,
            barcode: testData.userWithBarcode.barcode,
            active: true,
            type: 'patron',
            personal: {
              lastName: testData.userWithBarcode.username,
              preferredContactTypeId: '002',
            },
          },
          [],
          { userType: 'patron', barcode: true },
        ).then((userProperties) => {
          testData.userWithBarcode.userId = userProperties.userId;
        });

        // Create user WITHOUT barcode
        cy.createTempUserParameterized(
          {
            username: testData.userWithoutBarcode.username,
            active: true,
            type: 'patron',
            personal: {
              lastName: testData.userWithoutBarcode.username,
              preferredContactTypeId: '002',
            },
          },
          [],
          { userType: 'patron', barcode: false },
        ).then((userProperties) => {
          testData.userWithoutBarcode.userId = userProperties.userId;
        });
      });

      cy.createTempUser([Permissions.listsAll.gui, Permissions.loansView.gui]).then(
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
      Users.deleteViaApi(testData.userWithBarcode.userId);
      Users.deleteViaApi(testData.userWithoutBarcode.userId);
      Users.deleteViaApi(user.userId);
    });

    it(
      "C740218 Null/Empty values are returned with the 'not equal to' operator for the string types (corsair)",
      { tags: ['criticalPath', 'corsair', 'C740218'] },
      () => {
        // Step 1: Create new list and open query builder
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Configure query with "not equal to" operator for User Barcode AND username starts with filter
        QueryModal.selectField(usersFieldValues.userBarcode);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.fillInValueTextfield(testData.queryValue);
        QueryModal.addNewRow();
        QueryModal.selectField(usersFieldValues.userName, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
        QueryModal.fillInValueTextfield(usernamePrefix, 1);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 3: Verify "User — Barcode" column contains both barcode values and empty values
        // Verify at least one row with filled barcode
        QueryModal.clickShowColumnsButton();
        QueryModal.clickCheckboxInShowColumns(usersFieldValues.lastName);
        QueryModal.verifyMatchedRecordsIncludesByIdentifier(
          testData.userWithBarcode.username,
          usersFieldValues.userBarcode,
          testData.userWithBarcode.barcode,
        );

        // Verify at least one row with empty barcode (displayed as "")
        QueryModal.verifyMatchedRecordsIncludesByIdentifier(
          testData.userWithoutBarcode.username,
          usersFieldValues.userBarcode,
          '',
        );
      },
    );
  });
});
