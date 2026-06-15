import uuid from 'uuid';
import { SORT_DIRECTIONS } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Reading Room Access', () => {
  describe('Users pane', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      readingRooms: [
        {
          access: 'Allowed',
          id: uuid(),
          name: `AT_C476798_ReadingRoomAlpha_${randomPostfix}`,
          note: `AT_C476798_NoteAlpha_${randomPostfix}`,
          servicePoint: ServicePoints.getDefaultServicePoint({
            name: `AT_C476798_ServicePointAlpha_${randomPostfix}`,
          }),
        },
        {
          access: 'Not allowed',
          id: uuid(),
          name: `AT_C476798_ReadingRoomZulu_${randomPostfix}`,
          note: `AT_C476798_NoteZulu_${randomPostfix}`,
          servicePoint: ServicePoints.getDefaultServicePoint({
            name: `AT_C476798_ServicePointZulu_${randomPostfix}`,
          }),
        },
        {
          access: 'Allowed',
          id: uuid(),
          name: `AT_C476798_LibraryRoom_${randomPostfix}`,
          note: `AT_C476798_NoteLibrary_${randomPostfix}`,
          servicePoint: ServicePoints.getDefaultServicePoint({
            name: `AT_C476798_ServicePointLibrary_${randomPostfix}`,
          }),
        },
      ],
      user: {},
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

      cy.createTempUser([Permissions.uiCanViewReadingRoomAccess.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignReadingRoomAccess(
          testData.user.userId,
          testData.readingRooms.map((readingRoom) => ({
            id: uuid(),
            userId: testData.user.userId,
            readingRoomId: readingRoom.id,
            readingRoomName: readingRoom.name,
            access: readingRoom.access === 'Allowed' ? 'ALLOWED' : 'NOT_ALLOWED',
            notes: readingRoom.note,
          })),
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });

        UsersSearchPane.openUserCard(testData.user.username);
        UsersCard.waitLoading();
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
      'C476798 - Verify Combined Sorting and Filtering of Reading rooms on user details pane',
      { tags: ['extendedPath', 'volaris', 'C476798'] },
      () => {
        // Step 1: Apply a filter by entering partial text of "Room Name" and sort the filtered
        // results by clicking on the Room Name column header
        UsersCard.openReadingRoomAccessAccordion();

        UsersCard.filterReadingRoomsByName('ReadingRoom');
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[0].name);
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[1].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[2].name);

        UsersCard.clickReadingRoomColumnHeader('Name');
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[0].name);
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[1].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[2].name);
        UsersCard.verifyReadingRoomColumnSortOrder('Name', SORT_DIRECTIONS.ASCENDING);
        UsersCard.verifyReadingRoomAccessRoomsOrder([
          testData.readingRooms[0].name,
          testData.readingRooms[1].name,
        ]);

        // Step 2: Click on sort again
        UsersCard.clickReadingRoomColumnHeader('Name');
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[0].name);
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[1].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[2].name);
        UsersCard.verifyReadingRoomColumnSortOrder('Name', SORT_DIRECTIONS.DESCENDING);
        UsersCard.verifyReadingRoomAccessRoomsOrder([
          testData.readingRooms[1].name,
          testData.readingRooms[0].name,
        ]);
      },
    );
  });
});
