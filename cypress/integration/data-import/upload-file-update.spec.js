
/// <reference types="cypress" />

import { testType } from '../../support/utils/tagTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-data-import: MARC file upload with the update of instance, holding, and items', () => {
  const mappingProfile = {
    name: `autotest_mapping_profile_${getRandomPostfix()}`,
    incomingRecordType: 'MARC_BIBLIOGRAPHIC',
    existingRecordType: 'INSTANCE'
  };

  before('', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  beforeEach(() => {
    cy.createMappingProfileApi({
      ...mappingProfile
    });
  });

  it('C343335 Create a new mapping and action profiles', { tags: [testType.smoke] }, () => {

  });
});
