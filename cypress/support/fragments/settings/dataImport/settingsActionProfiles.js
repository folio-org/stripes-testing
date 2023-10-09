import getRandomPostfix from '../../../utils/stringTools';
import { PROFILE_TYPE_NAMES } from '../../../constants';

const marcAuthorityUpdateActionProfile = {
  profile: {
    name: `Use this one to update MARC authority records - action profile${getRandomPostfix()}`,
    description: '',
    action: 'UPDATE',
    folioRecord: 'MARC_AUTHORITY',
  },
  addedRelations: [
    {
      masterProfileId: null,
      masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
      // detailProfileId should be related with existing mapping profile
      detailProfileId: null,
      detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
    },
  ],
  deletedRelations: [],
};

export default {
  marcAuthorityUpdateActionProfile,
  createActionProfileApi: (actionProfile) => cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/actionProfiles',
    body: {
      ...actionProfile,
    },
    isDefaultSearchParamsRequired: false,
  }),
  deleteActionProfileApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-import-profiles/actionProfiles/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
