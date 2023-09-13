import getRandomPostfix from '../../../utils/stringTools';

const marcAuthorityMatchBy010TagProfile = {
  profile: {
    name: `Update MARC authority record -  Match Profile 010 $a${getRandomPostfix()}`,
    description: '',
    incomingRecordType: 'MARC_AUTHORITY',
    matchDetails: [
      {
        incomingRecordType: 'MARC_AUTHORITY',
        incomingMatchExpression: {
          fields: [
            {
              label: 'field',
              value: '010',
            },
            {
              label: 'indicator1',
              value: '',
            },
            {
              label: 'indicator2',
              value: '',
            },
            {
              label: 'recordSubfield',
              value: 'a',
            },
          ],
          staticValueDetails: null,
          dataValueType: 'VALUE_FROM_RECORD',
        },
        existingRecordType: 'MARC_AUTHORITY',
        existingMatchExpression: {
          fields: [
            {
              label: 'field',
              value: '010',
            },
            {
              label: 'indicator1',
              value: '',
            },
            {
              label: 'indicator2',
              value: '',
            },
            {
              label: 'recordSubfield',
              value: 'a',
            },
          ],
          staticValueDetails: null,
          dataValueType: 'VALUE_FROM_RECORD',
        },
        matchCriterion: 'EXACTLY_MATCHES',
      },
    ],
    existingRecordType: 'MARC_AUTHORITY',
  },
  addedRelations: [],
  deletedRelations: [],
};

export default {
  marcAuthorityMatchBy010TagProfile,
  createMatchProfileApi: (matchProfile = marcAuthorityMatchBy010TagProfile) => cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/matchProfiles',
    body: matchProfile,
    isDefaultSearchParamsRequired: false,
  }),
  deleteMatchProfileApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-import-profiles/matchProfiles/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
