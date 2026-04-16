import TopMenu from '../../../support/fragments/topMenu';
import ReadingRoom from '../../../support/fragments/reading-room/readingRoom';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';

describe('fse-reading-room-access - UI (no data manipulation)', () => {
  before(() => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
        const servicePointId = servicePoints[0].id;
        cy.getAdminUserId().then((adminUserId) => {
          cy.getUserServicePoints(adminUserId).then((servicePointsUsers) => {
            const existing = servicePointsUsers[0];
            if (existing) {
              if (existing.servicePointsIds.includes(servicePointId)) {
                return;
              }
              UserEdit.changeServicePointPreferenceViaApi(
                adminUserId,
                [servicePointId],
                existing.defaultServicePointId || servicePointId,
              );
            } else {
              UserEdit.addServicePointViaApi(servicePointId, adminUserId, servicePointId);
            }
          });
        });
      });
    });
  });

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.readingRoom,
      waiter: ReadingRoom.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195705 - verify that reading-room page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'reading-room', 'TC195705', 'sanity'] },
    () => {
      ReadingRoom.checkFieldsDisplayed();
    },
  );
});
