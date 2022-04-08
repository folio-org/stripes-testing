import getRandomPostfix from '../../../utils/stringTools';

const marcAuthorityUpdateActionProfile = {
  'profile': {
    'name': `Use this one to update MARC authority records - action profile${getRandomPostfix()}`,
    'action': 'UPDATE',
    'folioRecord': 'MARC_AUTHORITY'
  },
  'addedRelations': [
    {
      'masterProfileId': null,
      'masterProfileType': 'ACTION_PROFILE',
      // detailProfileId should be related with existing mapping profile
      'detailProfileId': null,
      'detailProfileType': 'MAPPING_PROFILE'
    }
  ]
};

export default {
  marcAuthorityUpdateActionProfile,
  createActionProfileApi: (actionProfile) => cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/actionProfiles',
    body: {
      ...actionProfile
    }
  }),
  deleteActionProfileApi:  (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-import-profiles/actionProfiles/${id}`,
    isDefaultSearchParamsRequired: false
  })
};
