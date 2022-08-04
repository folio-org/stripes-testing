import { getTestEntityValue } from '../../../../utils/stringTools';

const defaultServicePoint = {
  //required parameter
  code: undefined,
  discoveryDisplayName: getTestEntityValue('discovery_display_name'),
  //required parameter
  id: undefined,
  //required parameter
  name: undefined,
};

const getDefaultServicePointWithPickUpLocation = (servicePointName, id) => {
  return {
    ...defaultServicePoint,
    code: getTestEntityValue(servicePointName),
    id,
    name: getTestEntityValue(servicePointName),
    pickupLocation: true,
    holdShelfExpiryPeriod:{ intervalId:'Hours', 'duration':1 }
  };
};

export default {
  defaultServicePoint,
  getDefaultServicePointWithPickUpLocation,
  getViaApi: (searchParams) => cy.okapiRequest({
    path: 'service-points',
    searchParams,
  }).then(({ body }) => body.servicepoints),

  createViaApi : (servicePointParameters) => cy.okapiRequest({
    path: 'service-points',
    body: servicePointParameters,
    method: 'POST',
    isDefaultSearchParamsRequired: false
  }),

  deleteViaApi : (servicePointId) => cy.okapiRequest({
    path: `service-points/${servicePointId}`,
    method: 'DELETE',
    isDefaultSearchParamsRequired: false
  }),
};
