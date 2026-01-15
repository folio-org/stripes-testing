import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe(
    'Export query',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      const userData = {};
      let listData;

      beforeEach('Create test data', () => {
        listData = {
          name: `C552378-${getTestEntityValue('list')}`,
          description: `C552378-${getTestEntityValue('desc')}`,
          recordType: 'Users',
          fqlQuery: '',
          isActive: true,
          isPrivate: false,
        };

        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.usersViewRequests.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.inventoryAll.gui,
          Permissions.loansAll.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ])
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
          })
          .then(() => {
            Lists.buildQueryOnActiveUsersWithUsernames().then(({ query, fields }) => {
              Lists.createQueryViaApi(query).then((createdQuery) => {
                listData.queryId = createdQuery.queryId;
                listData.fqlQuery = createdQuery.fqlQuery;
                listData.fields = fields;

                Lists.createViaApi(listData).then((body) => {
                  listData.id = body.id;
                });
              });
            });
          });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteViaApi(listData.id);
        Users.deleteViaApi(userData.userId);
        Lists.deleteDownloadedFile(listData.name);
      });

      it(
        'C552378 Verify that "Export all columns (CSV)" exports all the columns of the proper entity types (corsair)',
        { tags: ['smoke', 'corsair', 'shiftLeft', 'C552378'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });

          Lists.verifyListIsPresent(listData.name);
          Lists.openList(listData.name);
          Lists.openActions();
          Lists.exportList();

          Lists.verifyCalloutMessage(
            `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
          );
          Lists.verifyCalloutMessage(`List ${listData.name} was successfully exported to CSV.`);
          Lists.checkDownloadedFileArray(listData.name, [
            'User - Active',
            'User - Address',
            'User - Barcode',
            'User - Created by user UUID',
            'User - Date of birth',
            'User - Department names',
            'User - Department UUIDs',
            'User - Email',
            'User - Enrollment date',
            'User - Expiration date',
            'User - External system ID',
            'User - First name',
            'User - Last name',
            'User - Last name, first name',
            'User - Middle name',
            'User - Mobile phone',
            'User - Phone',
            'User - Preferred contact type',
            'User - Preferred first name',
            'User - Pronouns',
            'User - Proxy for',
            'User - Tags tag list',
            'User - Type',
            'User - Updated by user UUID',
            'User - User created date',
            'User - User updated date',
            'User - User UUID',
            'User - Username',
            'Patron group - Name',
            'User created by - Email',
            'User created by - Last name, first name',
            'User created by - Username',
            'User updated by - Email',
            'User updated by - Last name, first name',
            'User updated by - Username',
          ]);
        },
      );
    },
  );
});
