import uuid from 'uuid';
import { SORT_DIRECTIONS } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';

const getReadingRoomAccessRoute = (userId) => `**/reading-room-patron-permission/${userId}`;

const getSortedReadingRoomNamesByUpdatedDate = (readingRoomAccessEntries, direction) => {
  const sortedReadingRoomAccessEntries = [...readingRoomAccessEntries].sort(
    (leftEntry, rightEntry) => {
      const leftUpdatedDate = leftEntry.metadata?.updatedDate || '';
      const rightUpdatedDate = rightEntry.metadata?.updatedDate || '';

      return leftUpdatedDate.localeCompare(rightUpdatedDate);
    },
  );

  if (direction === SORT_DIRECTIONS.DESCENDING) {
    sortedReadingRoomAccessEntries.reverse();
  }

  return sortedReadingRoomAccessEntries.map((entry) => entry.readingRoomName);
};

describe('Reading Room Access', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    readingRooms: [
      {
        access: 'Allowed',
        id: uuid(),
        name: `AT_C476796_ZuluRoom_${randomPostfix}`,
        note: `AT_C476796_BetaNote_${randomPostfix}`,
        servicePoint: ServicePoints.getDefaultServicePoint({
          name: `AT_C476796_ServicePointZulu_${randomPostfix}`,
        }),
      },
      {
        access: 'Not allowed',
        id: uuid(),
        name: `AT_C476796_AlphaRoom_${randomPostfix}`,
        note: `AT_C476796_GammaNote_${randomPostfix}`,
        servicePoint: ServicePoints.getDefaultServicePoint({
          name: `AT_C476796_ServicePointAlpha_${randomPostfix}`,
        }),
      },
      {
        access: 'Allowed',
        id: uuid(),
        name: `AT_C476796_MikeRoom_${randomPostfix}`,
        note: `AT_C476796_AlphaNote_${randomPostfix}`,
        servicePoint: ServicePoints.getDefaultServicePoint({
          name: `AT_C476796_ServicePointMike_${randomPostfix}`,
        }),
      },
    ],
    user: {},
  };
  const updateReadingRoomAccess = (readingRoom) => {
    UserEdit.openEdit();
    UserEdit.editAccessToReadingRoom(readingRoom.name, readingRoom.access, readingRoom.note);
    UserEdit.saveAndClose();
    UsersCard.waitLoading();
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      cy.wrap(testData.readingRooms).each((readingRoom) => {
        ServicePoints.createViaApi(readingRoom.servicePoint).then(({ body }) => {
          readingRoom.servicePointId = body.id;
          readingRoom.servicePointName = body.name;

          SettingsReadingRoom.createReadingRoomViaApi(
            body.id,
            body.name,
            readingRoom.id,
            false,
            readingRoom.name,
          );
        });
      });
    });

    cy.createTempUser([Permissions.uiCanViewEditReadingRoomAccess.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });

      UsersSearchPane.openUserCard(testData.user.username);
      UsersCard.waitLoading();

      cy.intercept('GET', getReadingRoomAccessRoute(testData.user.userId)).as(
        'getReadingRoomAccess',
      );

      testData.readingRooms.forEach((readingRoom) => {
        updateReadingRoomAccess(readingRoom);
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();

    testData.readingRooms.forEach((readingRoom) => {
      SettingsReadingRoom.deleteReadingRoomViaApi(readingRoom.id);
      ServicePoints.deleteViaApi(readingRoom.servicePointId);
    });

    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C476796 - Verify Sorting of reading room access on users pane',
    { tags: ['extendedPath', 'volaris', 'C476796'] },
    () => {
      UsersCard.waitLoading();

      // Step 1: Expand the Reading room access accordion on the user details pane
      UsersCard.openReadingRoomAccessAccordion();
      UsersCard.verifyReadingRoomColumnSortOrder('Access', SORT_DIRECTIONS.ASCENDING);

      // Step 2: Click the Access column header to sort in the opposite order
      UsersCard.clickReadingRoomColumnHeader('Access');
      UsersCard.verifyReadingRoomColumnSortOrder('Access', SORT_DIRECTIONS.DESCENDING);

      // Step 3: Click the Name column header to sort by Room Name
      UsersCard.clickReadingRoomColumnHeader('Name');
      UsersCard.verifyReadingRoomColumnSortOrder('Name', SORT_DIRECTIONS.ASCENDING);

      // Step 4: Click the Name column header again to sort in the opposite order
      UsersCard.clickReadingRoomColumnHeader('Name');
      UsersCard.verifyReadingRoomColumnSortOrder('Name', SORT_DIRECTIONS.DESCENDING);

      // Step 5: Click the Note column header to sort by notes
      UsersCard.clickReadingRoomColumnHeader('Note');
      UsersCard.verifyReadingRoomColumnSortOrder('Note', SORT_DIRECTIONS.ASCENDING, {
        filterValues: (v) => v !== '',
      });

      // Step 6: Click the Note column header again to sort in the opposite order
      UsersCard.clickReadingRoomColumnHeader('Note');
      UsersCard.verifyReadingRoomColumnSortOrder('Note', SORT_DIRECTIONS.DESCENDING, {
        filterValues: (v) => v !== '',
      });

      // Step 7: Click on the Last updated column header to sort by time
      UsersCard.clickReadingRoomColumnHeader('Last updated');

      // "Last updated" column is sorted by the time of record change,
      // which is not displayed on the UI, so we need to check the order of rooms against the API response
      cy.get('@getReadingRoomAccess.all').then((calls) => {
        const lastCall = calls[calls.length - 1];
        const readingRoomAccessEntries = lastCall.response.body.filter(({ readingRoomName }) => {
          return testData.readingRooms.some((readingRoom) => readingRoom.name === readingRoomName);
        });

        const expectedLastUpdatedAscending = getSortedReadingRoomNamesByUpdatedDate(
          readingRoomAccessEntries,
          SORT_DIRECTIONS.ASCENDING,
        );
        const expectedLastUpdatedDescending = getSortedReadingRoomNamesByUpdatedDate(
          readingRoomAccessEntries,
          SORT_DIRECTIONS.DESCENDING,
        );

        UsersCard.verifyReadingRoomAccessRoomsOrder(expectedLastUpdatedAscending);

        // Step 8: Click on the Last updated column header to sort in the opposite order
        UsersCard.clickReadingRoomColumnHeader('Last updated');
        UsersCard.verifyReadingRoomAccessRoomsOrder(expectedLastUpdatedDescending);
      });

      // Step 9: Open the user edit page and expand the Reading room access accordion
      UserEdit.openEdit();
      UserEdit.openReadingRoomAccessAccordion();
      UserEdit.verifyReadingRoomColumnSortOrder('Name', SORT_DIRECTIONS.ASCENDING);

      // Step 10: Click the Access column header to sort by access
      UserEdit.clickReadingRoomColumnHeader('Access');
      UserEdit.verifyReadingRoomColumnSortOrder('Access', SORT_DIRECTIONS.ASCENDING);

      // Step 11: Click the Access column header again to sort in the opposite order
      UserEdit.clickReadingRoomColumnHeader('Access');
      UserEdit.verifyReadingRoomColumnSortOrder('Access', SORT_DIRECTIONS.DESCENDING);

      // Step 12: Click the Name column header to sort by Room Name
      UserEdit.clickReadingRoomColumnHeader('Name');
      UserEdit.verifyReadingRoomColumnSortOrder('Name', SORT_DIRECTIONS.ASCENDING);

      // Step 13: Click the Name column header again to sort in the opposite order
      UserEdit.clickReadingRoomColumnHeader('Name');
      UserEdit.verifyReadingRoomColumnSortOrder('Name', SORT_DIRECTIONS.DESCENDING);

      // Step 14: Click the Note column header to sort by notes
      UserEdit.clickReadingRoomColumnHeader('Note');
      UserEdit.verifyReadingRoomColumnSortOrder('Note', SORT_DIRECTIONS.ASCENDING, {
        filterValues: (v) => v !== '',
      });

      // Step 15: Click the Note column header again to sort in the opposite order
      UserEdit.clickReadingRoomColumnHeader('Note');
      UserEdit.verifyReadingRoomColumnSortOrder('Note', SORT_DIRECTIONS.DESCENDING, {
        filterValues: (v) => v !== '',
      });
    },
  );
});
