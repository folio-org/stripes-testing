import getRandomPostfix from '../../../utils/stringTools';

const marcAuthorityUpdateMappingProfile = {
  'name': `Update MARC authority records mapping profile${getRandomPostfix()}`,
  'incomingRecordType': 'MARC_AUTHORITY',
  'existingRecordType': 'MARC_AUTHORITY',
  'mappingDetails': {
    'name': 'marcAuthority',
    'recordType': 'MARC_AUTHORITY',
    'marcMappingOption': 'UPDATE',
    'mappingFields': [
      {
        'name': 'discoverySuppress',
        'enabled': true,
        'path': 'marcAuthority.discoverySuppress',
        'value': null,
        'booleanFieldAction': 'IGNORE',
        'subfields': []
      },
      {
        'name': 'hrid',
        'enabled': true,
        'path': 'marcAuthority.hrid',
        'value': '',
        'subfields': []
      }
    ]
  }
};

export default {
  marcAuthorityUpdateMappingProfile,
  createMappingProfileApi:   (mappingProfile = marcAuthorityUpdateMappingProfile) => cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/mappingProfiles',
    body: {
      profile: { ...mappingProfile }
    },
    isDefaultSearchParamsRequired: false
  }),
  unlinkMappingProfileFromActionProfileApi:  (id, linkedMappingProfile) => cy.okapiRequest({
    method: 'PUT',
    path: `data-import-profiles/mappingProfiles/${id}`,
    body: linkedMappingProfile,
    isDefaultSearchParamsRequired: false
  }),
  deleteMappingProfileApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-import-profiles/mappingProfiles/${id}`,
    isDefaultSearchParamsRequired: false
  })
};
