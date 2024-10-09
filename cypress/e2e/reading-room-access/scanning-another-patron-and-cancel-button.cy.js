import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import ReadingRoom from '../../support/fragments/reading-room/readingRoom';
import SettingsReadingRoom from '../../support/fragments/settings/tenant/general/readingRoom';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
// import Users from '../../support/fragments/users/users';
// import InteractorsTools from '../../support/utils/interactorsTools';

describe('Reading Room Access', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    servicePointId: '',
    readingRoomId: uuid(),
  };

  before('Create test data and login', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint)
        .then((servicePoint) => {
          testData.servicePointId = servicePoint.body.id;
        })
        .then(() => SettingsReadingRoom.createReadingRoomViaApi(
          testData.servicePointId,
          testData.servicePoint.name,
          testData.readingRoomId,
        ));
    });

    cy.createTempUser([Permissions.uiReadingRoomAll.gui]).then((userProperties) => {
      testData.firstUser = userProperties;

      UserEdit.addServicePointViaApi(
        testData.servicePointId,
        testData.firstUser.userId,
        testData.servicePointId,
      );
    });

    cy.loginAsAdmin({
      path: TopMenu.readingRoom,
      waiter: ReadingRoom.waitLoading,
    });
  });

  // after('Deleting created entities', () => {});

  it(
    'C494054 Validate Functionality of Scan Patron Card page with allowed user (volaris)',
    { tags: ['smoke', 'volaris'] },
    () => {},
  );
});
