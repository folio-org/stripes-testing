import getRandomPostfix from '../../../utils/stringTools';

const marcAuthorityMatchBy010TagProfile = {
  'profile': {
    'name': `Update MARC authority record -  Match Profile 010 $a${getRandomPostfix()}`,
    'incomingRecordType': 'MARC_AUTHORITY',
    'matchDetails': [
      {
        'incomingRecordType': 'MARC_AUTHORITY',
        'existingRecordType' : 'MARC_AUTHORITY',
        'incomingMatchExpression': {
          'dataValueType' : 'VALUE_FROM_RECORD',
          'fields' : [{
            'label' : 'field',
            'value' : '010'
          }, {
            'label' : 'indicator1',
            'value' : ''
          }, {
            'label' : 'indicator2',
            'value' : ''
          }, {
            'label' : 'recordSubfield',
            'value' : 'a'
          }]
        },
        'matchCriterion' : 'EXACTLY_MATCHES',
        'existingMatchExpression' : {
          'dataValueType' : 'VALUE_FROM_RECORD',
          'fields' : [{
            'label' : 'field',
            'value' : '010'
          }, {
            'label' : 'indicator1',
            'value' : ''
          }, {
            'label' : 'indicator2',
            'value' : ''
          }, {
            'label' : 'recordSubfield',
            'value' : 'a'
          }]
        },
      }
    ],
    'existingRecordType': 'MARC_AUTHORITY'
  },
};

export default {
  marcAuthorityMatchBy010TagProfile,
  createMatchProfileApi: (matchProfile = marcAuthorityMatchBy010TagProfile) => cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/matchProfiles',
    body: matchProfile,
    isDefaultSearchParamsRequired: false
  }),
  deleteMatchProfileApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-import-profiles/matchProfiles/${id}`,
    isDefaultSearchParamsRequired: false
  })
};
