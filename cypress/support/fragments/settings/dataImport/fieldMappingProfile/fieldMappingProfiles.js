import uuid from 'uuid';

import { Button } from '../../../../../../interactors';
import ResultsPane from '../resultsPane';
import FieldMappingProfileEditForm from './fieldMappingProfileEditForm';
import FieldMappingProfileView from './fieldMappingProfileView';
import getRandomPostfix from '../../../../utils/stringTools';

const marcAuthorityUpdateMappingProfile = {
  profile: {
    name: `Update MARC authority records mapping profile${getRandomPostfix()}`,
    incomingRecordType: 'MARC_AUTHORITY',
    existingRecordType: 'MARC_AUTHORITY',
    description: '',
    mappingDetails: {
      name: 'marcAuthority',
      recordType: 'MARC_AUTHORITY',
      marcMappingOption: 'UPDATE',
      mappingFields: [
        {
          name: 'discoverySuppress',
          enabled: true,
          path: 'marcAuthority.discoverySuppress',
          value: null,
          booleanFieldAction: 'IGNORE',
          subfields: [],
        },
        {
          name: 'hrid',
          enabled: true,
          path: 'marcAuthority.hrid',
          value: '',
          subfields: [],
        },
      ],
    },
  },
  addedRelations: [],
  deletedRelations: [],
};

export default {
  ...ResultsPane,
  clickCreateNewFieldMappingProfile() {
    ResultsPane.expandActionsDropdown();
    cy.do(Button('New field mapping profile').click());
    FieldMappingProfileEditForm.waitLoading();
    FieldMappingProfileEditForm.verifyFormView();

    return FieldMappingProfileEditForm;
  },
  openFieldMappingProfileView(mappingProfileName) {
    ResultsPane.searchByName(mappingProfileName);
    FieldMappingProfileView.waitLoading();
    FieldMappingProfileView.verifyFormView();

    return FieldMappingProfileView;
  },
  marcAuthorityUpdateMappingProfile,
  getDefaultMappingProfile({
    name = `autotest_mapping_profile_${getRandomPostfix()}`,
    id = uuid(),
  } = {}) {
    return {
      ...marcAuthorityUpdateMappingProfile,
      profile: {
        ...marcAuthorityUpdateMappingProfile.profile,
        name,
        id,
      },
    };
  },
  createMappingProfileViaApi: (mappingProfile = marcAuthorityUpdateMappingProfile) => cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/mappingProfiles',
    body: mappingProfile,
    isDefaultSearchParamsRequired: false,
  }),
  unlinkMappingProfileFromActionProfileApi: (id, linkedMappingProfile) => cy.okapiRequest({
    method: 'PUT',
    path: `data-import-profiles/mappingProfiles/${id}`,
    body: linkedMappingProfile,
    isDefaultSearchParamsRequired: false,
  }),
  deleteMappingProfileViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-import-profiles/mappingProfiles/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
