import ServicePoints from '../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../support/fragments/users/userEdit';

describe('Prepare test data', () => {
  it('001 Assign service points to admin user', { tags: ['prepareTestData', 'smoke'] }, () => {
    const servicePointIds = [];
    let defaultServicePointId;
    let userId;
    cy.getAdminToken().then(() => {
      cy.getAdminUserId().then((id) => {
        userId = id;
      })
        .then(() => {
          // Get or create Circ Desk 1 service point
          ServicePoints.getOrCreateCircDesk1ServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
            defaultServicePointId = servicePoint.id;
          });
          // Get or create Circ Desk 2 service point
          ServicePoints.getOrCreateCircDesk2ServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
          });
          // Get Online service point (assuming it exists or should be created elsewhere)
          ServicePoints.getOnlineServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
          });
        }).then(() => {
          UserEdit.changeServicePointPreferenceViaApi(
            userId,
            servicePointIds,
            defaultServicePointId,
          );
        });
    });
  });
});
