import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import NewRequest from '../../support/fragments/requests/newRequest';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SelectUser from '../../support/fragments/requests/selectUser';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Using the requester lookup', () => {
  let userData1 = {};
  let userData2 = {};
  let servicePoint;
  const patronGroup = {
    name: 'groupRequesterLookup' + getRandomPostfix(),
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi();
      })
      .then((sp) => {
        servicePoint = sp;
        PatronGroups.createViaApi(patronGroup.name);
      })
      .then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;

        cy.createTempUser([Permissions.uiRequestsAll.gui], patronGroup.name);
      })
      .then((userProperties1) => {
        userData1 = userProperties1;

        UserEdit.addServicePointViaApi(servicePoint.id, userData1.userId, servicePoint.id);

        cy.createTempUser([], patronGroup.name);
      })
      .then((userProperties2) => {
        userData2 = userProperties2;
      })
      .then(() => {
        cy.login(userData1.username, userData1.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData1.userId);
    Users.deleteViaApi(userData2.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C553 While creating a request, search for requester using the requester lookup (vega)',
    { tags: ['extendedPath', 'vega', 'C553'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();
      NewRequest.checkRequestsFields();

      // Click the "Requester lookup" link at the requester section
      NewRequest.openRequesterLookup();
      SelectUser.verifySelectUserModalExists();

      // Filter users using the filters
      SelectUser.searchUser(userData1.username);
      SelectUser.verifyUserFoundInResults(userData1.username);
      SelectUser.clearAllFilters();

      SelectUser.searchUser(userData1.barcode);
      SelectUser.verifyUserFoundInResults(userData1.username);
      SelectUser.clearAllFilters();

      SelectUser.filterByPatronGroup(patronGroup.name);
      SelectUser.verifyUserFoundInResults(userData1.username);

      // Sort the search results using the column headers
      SelectUser.sortByColumn('Name');
      SelectUser.checkAllValuesInColumnSorted(0);

      // Verify Appropriate results are displayed (users still visible after sorting)
      SelectUser.verifyUserFoundInResults(userData1.username);
      SelectUser.verifyUserFoundInResults(userData2.username);
      SelectUser.selectUserFromList(userData1.username);

      // Verify The user's info is displayed in the Requester information section
      NewRequest.verifyRequesterInformation(userData1.username, userData1.barcode);
      SelectUser.verifySelectUserModalClosed();
    },
  );
});
