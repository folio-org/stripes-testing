import ServicePoints from '../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../support/fragments/users/userEdit';

describe('Prepare test data', () => {
  it('001 Assign service points to admin user', { tags: ['prepareTestData', 'smoke'] }, () => {
    const servicePointIds = [];
    let defaultServicePointId;
    let userId;
    cy.getAdminToken().then(() => {
      cy.getAdminUserId()
        .then((id) => {
          userId = id;
        })
        .then(() => {
          ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
            defaultServicePointId = servicePoint.id;
          });
          ServicePoints.getCircDesk2ServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
          });
          ServicePoints.getOnlineServicePointViaApi().then((servicePoint) => {
            servicePointIds.push(servicePoint.id);
          });
        })
        .then(() => {
          UserEdit.changeServicePointPreferenceViaApi(
            userId,
            servicePointIds,
            defaultServicePointId,
          );
        });
    });
  });
});
