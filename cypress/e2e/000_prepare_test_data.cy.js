import ServicePoints from '../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../support/fragments/users/userEdit';

describe('Prepare test data', () => {
  it('001 Assign service points to admin user', { tags: ['prepareTestData', 'smoke'] }, () => {
    const servicePointIds = [];
    let defaultServicePointId;
    let userId;
    cy.getAdminToken().then(() => {
      cy.getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` }).then((user) => {
        userId = user[0].id;
      });
      ServicePoints.getViaApi()
        .then((servicePoints) => {
          defaultServicePointId = servicePoints.find((sp) => sp.name.includes('Circ Desk 1')).id;
          servicePointIds.push(defaultServicePointId);
          servicePointIds.push(servicePoints.find((sp) => sp.name.includes('DCB')).id);
          servicePointIds.push(servicePoints.find((sp) => sp.name.includes('Circ Desk 2')).id);
          servicePointIds.push(servicePoints.find((sp) => sp.name.includes('Online')).id);
        })
        .then(() => {
          cy.log(servicePointIds);
          cy.log(userId);
          cy.log(defaultServicePointId);
          UserEdit.changeServicePointPreferenceViaApi(
            userId,
            servicePointIds,
            defaultServicePointId,
          );
        })
        .then(() => {
          cy.getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` }).then(
            (user) => {
              userId = user[0].id;
            },
          );
        });
    });
  });
});
