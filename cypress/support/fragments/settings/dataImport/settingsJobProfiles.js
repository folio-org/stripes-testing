import getRandomPostfix from '../../../utils/stringTools';
import { PROFILE_TYPE_NAMES } from '../../../constants';

const marcAuthorityUpdateJobProfile = {
  profile: {
    name: `Update MARC authority records - 010 $a${getRandomPostfix()}`,
    description: '',
    dataType: 'MARC',
  },
  addedRelations: [
    {
      masterProfileId: null,
      masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
      // match profile should be specified
      detailProfileId: null,
      detailProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
      order: 0,
    },
    {
      // match profile should be specified
      masterProfileId: null,
      masterProfileType: PROFILE_TYPE_NAMES.MATCH_PROFILE,
      // action profile should be specified
      detailProfileId: null,
      detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
      order: 0,
      reactTo: 'MATCH',
    },
  ],
  deletedRelations: [],
};

export default {
  marcAuthorityUpdateJobProfile,
  createJobProfileApi: (jobProfile = marcAuthorityUpdateJobProfile) => cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/jobProfiles',
    body: jobProfile,
  }),
  deleteJobProfileApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-import-profiles/jobProfiles/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
