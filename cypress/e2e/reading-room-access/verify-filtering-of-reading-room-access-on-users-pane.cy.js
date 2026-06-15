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
          name: `AT_C476797_AlphaRoom_${randomPostfix}`,
          note: `AT_C476797_AlphaNote_${randomPostfix}`,
          servicePoint: ServicePoints.getDefaultServicePoint({
            name: `AT_C476797_ServicePointAlpha_${randomPostfix}`,
          }),
        },
        {
          access: 'Not allowed',
          id: uuid(),
          name: `AT_C476797_BetaRoom_${randomPostfix}`,
          note: `AT_C476797_BetaNote_${randomPostfix}`,
          servicePoint: ServicePoints.getDefaultServicePoint({
            name: `AT_C476797_ServicePointBeta_${randomPostfix}`,
          }),
        },
        {
          access: 'Allowed',
          id: uuid(),
          name: `AT_C476797_GammaRoom_${randomPostfix}`,
          note: `AT_C476797_GammaNote_${randomPostfix}`,
          servicePoint: ServicePoints.getDefaultServicePoint({
            name: `AT_C476797_ServicePointGamma_${randomPostfix}`,
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
      'C476797 - Verify filtering of reading room access on users pane',
      { tags: ['extendedPath', 'volaris', 'C476797'] },
      () => {
        // Step 1: Navigate to the "Reading room access" accordion
        UsersCard.openReadingRoomAccessAccordion();
        UsersCard.verifyReadingRoomColumnSortOrder('Access', SORT_DIRECTIONS.ASCENDING);

        // Step 2: Enter a partial "Room Name" to filter the results
        UsersCard.filterReadingRoomsByName('Alpha');
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[0].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[1].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[2].name);

        // Step 3: Enter a full "Room Name" to filter the results
        UsersCard.filterReadingRoomsByName(testData.readingRooms[0].name);
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[0].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[1].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[2].name);

        // Step 4: Clear the filter
        UsersCard.clearReadingRoomFilter();
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[0].name);
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[1].name);
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[2].name);
        UsersCard.verifyReadingRoomColumnSortOrder('Access', SORT_DIRECTIONS.ASCENDING);

        // Step 5: Enter a Room Name in lowercase to filter the results
        UsersCard.filterReadingRoomsByName('alpharoom');
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[0].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[1].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[2].name);

        // Step 6: Enter a Room Name in uppercase to filter the results
        UsersCard.filterReadingRoomsByName('ALPHAROOM');
        UsersCard.verifyReadingRoomCellExists(testData.readingRooms[0].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[1].name);
        UsersCard.verifyReadingRoomCellAbsent(testData.readingRooms[2].name);
      },
    );
  });
});
