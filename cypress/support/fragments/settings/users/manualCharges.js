import getRandomPostfix from '../../../utils/stringTools';

const defaultFeeFineType = {
  // required field
  ownerId: undefined,
  // required field
  // id: undefined,
  feeFineType: `testFeeFineType${getRandomPostfix()}`,
  defaultAmount: 100.00,
  automatic: false,
};

export default {
  defaultFeeFineType,
  createViaApi : (ownerIdfeeFineTypeProperties) => cy.okapiRequest({
    method: 'POST',
    path: 'feefines',
    isDefaultSearchParamsRequired : false,
    body: ownerIdfeeFineTypeProperties
  }).then(response => ({
    id: response.body.id,
    feeFineType: response.body.feeFineType
  })),
  deleteViaApi: (manualChargeId) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `feefines/${manualChargeId}`,
      isDefaultSearchParamsRequired : false
    });
  }
};
