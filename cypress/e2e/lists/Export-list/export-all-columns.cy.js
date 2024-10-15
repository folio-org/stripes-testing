import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('export query', () => {
    const userData = {};
    const listData = {
      name: `C552378-${getTestEntityValue('test_list')}`,
      description: `C552378-${getTestEntityValue('test_list_description')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.getAdminToken();
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

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteViaApi(listData.id);
      Users.deleteViaApi(userData.userId);
      Lists.deleteDownloadedFile(listData.name);
    });

    it(
      'C552378 Verify that "Export all columns (CSV)" exports all the columns of the proper entity types (corsair)',
      { tags: ['smoke', 'corsair', 'C552378'] },
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
        Lists.checkDownloadedFile(
          listData.name,
          '"groups.created_by_user_id","groups.created_by_username",groups.created_date,groups.desc,"groups.expiration_off_set_in_days",groups.group,groups.source,"groups.updated_by_user_id","groups.updated_by_username",groups.updated_date,groups.id,users.active,users.addresses,users.barcode,users.created_by_user_id,users.created_date,users.date_of_birth,users.departments,users.department_ids,users.email,users.enrollment_date,users.expiration_date,users.external_system_id,users.first_name,users.last_name,"users.last_name_first_name",users.middle_name,users.mobile_phone,users.patron_group,users.phone,"users.preferred_contact_type","users.preferred_first_name",users.proxy_for,users.tags_tag_list,users.type,users.updated_by_user_id,users.updated_date,users.user_created_date,users.user_updated_date,users.id,users.username',
        );
      },
    );
  });
});
