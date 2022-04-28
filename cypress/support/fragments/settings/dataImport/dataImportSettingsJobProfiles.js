import getRandomPostfix from '../../../utils/stringTools';

const marcAuthorityUpdateJobProfile = {
  'profile': {
    'name': `Update MARC authority records - 010 $a${getRandomPostfix()}`,
    'description': '',
    'dataType': 'MARC'
  },
  'addedRelations': [
    {
      'masterProfileId': null,
      'masterProfileType': 'JOB_PROFILE',
      // match profile should be specified
      'detailProfileId': null,
      'detailProfileType': 'MATCH_PROFILE',
      'order': 0
    },
    {
      // match profile should be specified
      'masterProfileId': null,
      'masterProfileType': 'MATCH_PROFILE',
      // action profile should be specified
      'detailProfileId': null,
      'detailProfileType': 'ACTION_PROFILE',
      'order': 0,
      'reactTo': 'MATCH'
    }
  ],
  'deletedRelations': []
};

export default {
  marcAuthorityUpdateJobProfile,
  createJobProfileApi: (jobProfile = marcAuthorityUpdateJobProfile) => cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/jobProfiles',
    body: jobProfile
  }),
  deleteJobProfileApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-import-profiles/jobProfiles/${id}`,
    isDefaultSearchParamsRequired: false
  })
};
