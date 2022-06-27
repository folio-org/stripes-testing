import ServicePoints from '../settings/tenant/servicePoints/servicePoints';
import paymentMethods from '../settings/users/paymentMethods';
import UserEdit from './userEdit';

export default {
  waiveFeeFine:(userId, amount, ownerId) => {
    // TODO: related with request to account getting
    cy.wait(2000);
    cy.okapiRequest({
      method: 'GET',
      path: 'accounts',
      searchParams: { query: `(userId==${userId})` },
      isDefaultSearchParamsRequired : false,
    }).then(response => {
      const accountId = response.body.accounts[0]?.id;
      paymentMethods.createViaApi(ownerId).then(paymentMethodProperties => {
        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then(requestedServicePoints => {
          const servicePointId = requestedServicePoints[0].id;
          UserEdit.addServicePointViaApi(servicePointId, userId).then(() => {
            cy.okapiRequest({
              method: 'POST',
              path: `accounts/${accountId}/waive`,
              body: {
                amount,
                // TODO: add management of payment method
                paymentMethod: paymentMethodProperties.id,
                notifyPatron: false,
                servicePointId,
                // all api methods run by diku
                userName: 'ADMINISTRATOR, DIKU'
              },
              isDefaultSearchParamsRequired : false,
            });
            // test data clearing
            paymentMethods.deleteViaApi(paymentMethodProperties.id);
          });
        });
      });
    });
  }
};
