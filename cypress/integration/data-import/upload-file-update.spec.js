
/// <reference types="cypress" />

import { testType } from '../../support/utils/tagTools';
import getRandomPostfix from '../../support/utils/stringTools';
import settingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import newJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';

const collectionIdOfMappingProfiles = [];
const collectionIdOfActionProfiles = [];
const collectionNamesOfActionProfiles = [];

describe('ui-data-import: MARC file upload with the update of instance, holding, and items', () => {
  const holdingsMappingProfile = {
    id: '',
    name: `autotest_holdings_mapping_profile_${getRandomPostfix()}`,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'HOLDINGS',
    mappingDetails: { mappingFields: [{ name: 'permanentLocationId',
      path: 'holdings.permanentLocationId',
      value: '"Annex (KU/CC/DI/A)"' }] }
  };

  const itemMappingProfile = {
    id: '',
    name: `autotest_item_mapping_profile_${getRandomPostfix()}`,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'ITEM',
    mappingDetails: { mappingFields: [
      { name: 'materialType.id',
        path: 'item.materialType.id',
        value: '"book"' },
      { name: 'permanentLoanType.id',
        path: 'item.permanentLoanType.id',
        value: '"Can circulate"' },
      { name: 'status.name',
        path: 'item.status.name',
        value: '"In process"' }] }
  };

  const holdingsActionProfile = {
    profile: {
      id: '',
      name: `autotest_holdings_action_profile_${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecord: 'HOLDINGS'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: []
  };

  const itemActionProfile = {
    profile: {
      id: '',
      name: `autotest_item_action_profile_${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecord: 'ITEM'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: []
  };

  const testDateMappingProfile = {
    instanceMappingProfile : {
      id: '',
      name: `autotest_instance_mapping_profile_${getRandomPostfix()}`,
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      existingRecordType: 'INSTANCE',
    }
  };

  const testDateActionProfile = {
    instanceActionProfile : {
      profile: {
        id: '',
        name: `autotest_instance_action_profile_${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecord: 'INSTANCE'
      },
      addedRelations: [
        {
          masterProfileId: null,
          masterProfileType: 'ACTION_PROFILE',
          detailProfileId: '',
          detailProfileType: 'MAPPING_PROFILE'
        }
      ],
      deletedRelations: []
    }
  };


  before('navigates to application', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  beforeEach(() => {
    cy.createMappingProfileApi({
      ...holdingsMappingProfile,
    }).then(({ body }) => {
      holdingsActionProfile.addedRelations[0].detailProfileId = body.id;
      cy.log('body id: ' + body.id);
      collectionIdOfMappingProfiles.push(body.id);
      cy.log('collectionIdOfMappingProfiles: ' + collectionIdOfMappingProfiles);
      holdingsMappingProfile.name = body.name;
      cy.createActionProfileApi({
        ...holdingsActionProfile
      }).then(({ body }) => {
        holdingsActionProfile.id = body.id;
        collectionIdOfActionProfiles.push(body.id);
        holdingsActionProfile.name = body.name;
        collectionNamesOfActionProfiles.push(body.name);
      });
    });

    cy.createMappingProfileApi({
      ...itemMappingProfile,
    }).then(({ body }) => {
      itemActionProfile.addedRelations[0].detailProfileId = body.id;
      collectionIdOfMappingProfiles.push(body.id);
      itemMappingProfile.name = body.name;
      cy.createActionProfileApi({
        ...itemActionProfile
      }).then(({ body }) => {
        itemActionProfile.id = body.id;
        collectionIdOfActionProfiles.push(body.id);
        itemActionProfile.name = body.name;
        collectionNamesOfActionProfiles.push(body.name);
        cy.log('collectionNamesOfActionProfiles: ' + collectionNamesOfActionProfiles);
      });
    });
  });

  it('C343335 ', { tags: [testType.smoke] }, () => {


  });
});
