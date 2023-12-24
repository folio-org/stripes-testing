import uuid from 'uuid';

import { Button } from '../../../../../../interactors';
import mappingDetails from './mappingDetails';
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
    mappingDetails: mappingDetails.MARC_AUTHORITY,
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
  openFieldMappingProfileView({ name, type }) {
    ResultsPane.searchByName(name);
    FieldMappingProfileView.waitLoading();
    FieldMappingProfileView.verifyFormView({ type });

    return FieldMappingProfileView;
  },
  marcAuthorityUpdateMappingProfile,
  getDefaultMappingProfile({
    incomingRecordType = 'MARC_AUTHORITY',
    existingRecordType = 'MARC_AUTHORITY',
    mappingFields = [],
    id = uuid(),
    name,
  } = {}) {
    const mappingFieldsNames = mappingFields.map(({ name: fieldName }) => fieldName);
    const updatedMappingFields = mappingDetails[existingRecordType].mappingFields.reduce(
      (acc, it) => {
        if (mappingFieldsNames.includes(it.name)) {
          const field = mappingFields.find(({ name: fieldName }) => fieldName === it.name);
          return [...acc, { ...it, value: field.value }];
        }
        return [...acc, it];
      },
      [],
    );

    return {
      profile: {
        id,
        name:
          name ||
          `autotest_${existingRecordType.toLowerCase()}_mapping_profile_${getRandomPostfix()}`,
        incomingRecordType,
        existingRecordType,
        description: '',
        mappingDetails: {
          ...mappingDetails[existingRecordType],
          mappingFields: updatedMappingFields,
        },
      },
      addedRelations: [],
      deletedRelations: [],
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
