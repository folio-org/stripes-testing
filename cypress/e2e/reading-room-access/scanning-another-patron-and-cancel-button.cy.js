import uuid from 'uuid';
// import Permissions from '../../support/dictionary/permissions';
import ReadingRoom from '../../support/fragments/reading-room/readingRoom';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
// import Users from '../../support/fragments/users/users';
// import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
// import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';

describe('Reading Room Access', () => {
  // let totalRecordsBefore;
  // let totalRecordsAfter;
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    servicePointId: '',
    readingRoomId: uuid(),
    readingRoomName: `Autotest_Reading_Room${getRandomPostfix()}`,
    isPublic: true,
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint)
        .then((servicePoint) => {
          testData.servicePointId = servicePoint.body.id;
          console.log(testData.servicePoint.name);
          SettingsReadingRoom.createReadingRoomViaApi(
            testData.servicePointId,
            testData.servicePoint.name,
            testData.readingRoomId,
            testData.isPublic,
            testData.readingRoomName,
          );
        })
        .then(() => {
          //   cy.getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` }).then(
          //     (users) => {
          //       const adminId = users[0].id;
          //       console.log(adminId);
          //       console.log(testData.servicePointId);
          //       UserEdit.addServicePointViaApi(
          //         testData.servicePointId,
          //         adminId,
          //         testData.servicePointId,
          //       );
          //     },
          //   );
        });
    });

    // create patron user with access to reading room
    cy.createTempUser([]).then((userProperties) => {
      testData.patronUser = userProperties;

      // PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      //   patronGroup.id = patronGroupResponse;
      // });
      UserEdit.addServicePointViaApi(
        testData.servicePointId,
        testData.patronUser.userId,
        testData.servicePointId,
      );
    });

    // create first user
    cy.createTempUser([]).then((userProperties) => {
      testData.firstUser = userProperties;
    });

    // create second user
    cy.createTempUser([]).then((userProperties) => {
      testData.secondUser = userProperties;
    });

    cy.loginAsAdmin({
      path: TopMenu.readingRoom,
      waiter: ReadingRoom.waitLoading,
    });
    cy.pause();
    // SwitchServicePoint.switchServicePoint(testData.servicePoint.name);
  });

  // after('Deleting created entities', () => {});

  it(
    'C494350 Validate Functionality of scanning another patron and cancel button on Reading room access app (volaris)',
    { tags: ['smoke', 'volaris'] },
    () => {
      ReadingRoom.getReadingRoomViaApi({
        query: `readingRoomName="${testData.readingRoomName}"`,
      }).then((resp) => {
        // ReadingRoom.getReadingRoomViaApi({ query: 'readingRoomName=<reading room 1 name>' }).then((resp) => {
        console.log(resp);
      });
      // =<reading room 1 name>
    },
  );
});
