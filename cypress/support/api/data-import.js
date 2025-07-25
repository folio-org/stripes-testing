/// <reference types="cypress" />
import { ACCEPTED_DATA_TYPE_NAMES, PROFILE_TYPE_NAMES } from '../constants';
import { ActionProfiles as SettingsActionProfiles } from '../fragments/settings/dataImport';
import FieldMappingProfiles from '../fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import JobProfiles from '../fragments/settings/dataImport/jobProfiles/jobProfiles';
import getRandomPostfix from '../utils/stringTools';

Cypress.Commands.add('getId', () => {
  return cy.okapiRequest({
    path: 'data-import/uploadDefinitions',
    searchParams: {
      query: '(status==("NEW" OR "IN_PROGRESS" OR "LOADED")) sortBy createdDate/sort.descending',
      limit: 1,
    },
  });
});

const addJobProfileRelation = (expectedRelations, actionProfileId) => {
  const defaultJobProfileRelation = {
    masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
    detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
  };
  const newJobProfileRelation = { ...defaultJobProfileRelation };
  newJobProfileRelation.order = expectedRelations.length;
  newJobProfileRelation.detailProfileId = actionProfileId;
  expectedRelations.push(newJobProfileRelation);
};

Cypress.Commands.add('addJobProfileRelation', (expectedRelations, actionProfileId) => {
  const defaultJobProfileRelation = {
    masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
    detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
  };
  const newJobProfileRelation = { ...defaultJobProfileRelation };
  newJobProfileRelation.order = expectedRelations.length;
  newJobProfileRelation.detailProfileId = actionProfileId;
  expectedRelations.push(newJobProfileRelation);
});

/**
 * @name cy.createLinkedProfiles
 * @param {Object[]} testData - Test data create and link mapping, action and job profiles.
 */
Cypress.Commands.add('createLinkedProfiles', (testData) => {
  const jobProfile = {
    profile: {
      name: `autotest_job_profile_${getRandomPostfix()}`,
      dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    },
    addedRelations: [],
    deletedRelations: [],
  };

  testData.jobProfileForCreate = jobProfile;

  FieldMappingProfiles.createMappingProfileViaApi(testData.marcBibMappingProfile).then(
    (bodyWithMappingProfile) => {
      testData.marcBibActionProfile.addedRelations[0].detailProfileId =
        bodyWithMappingProfile.body.id;
      SettingsActionProfiles.createActionProfileViaApi(testData.marcBibActionProfile).then(
        (bodyWithActionProfile) => {
          addJobProfileRelation(
            testData.jobProfileForCreate.addedRelations,
            bodyWithActionProfile.body.id,
          );
        },
      );
    },
  );

  FieldMappingProfiles.createMappingProfileViaApi(testData.instanceMappingProfile).then(
    (bodyWithMappingProfile) => {
      testData.instanceActionProfile.addedRelations[0].detailProfileId =
        bodyWithMappingProfile.body.id;
      SettingsActionProfiles.createActionProfileViaApi(testData.instanceActionProfile).then(
        (bodyWithActionProfile) => {
          addJobProfileRelation(
            testData.jobProfileForCreate.addedRelations,
            bodyWithActionProfile.body.id,
          );
        },
      );
    },
  );

  FieldMappingProfiles.createMappingProfileViaApi(testData.holdingsMappingProfile).then(
    (bodyWithMappingProfile) => {
      testData.holdingsActionProfile.addedRelations[0].detailProfileId =
        bodyWithMappingProfile.body.id;
      SettingsActionProfiles.createActionProfileViaApi(testData.holdingsActionProfile).then(
        (bodyWithActionProfile) => {
          addJobProfileRelation(
            testData.jobProfileForCreate.addedRelations,
            bodyWithActionProfile.body.id,
          );
        },
      );
    },
  );

  FieldMappingProfiles.createMappingProfileViaApi(testData.itemMappingProfile).then(
    (bodyWithMappingProfile) => {
      testData.itemActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
      SettingsActionProfiles.createActionProfileViaApi(testData.itemActionProfile).then(
        (bodyWithActionProfile) => {
          addJobProfileRelation(
            testData.jobProfileForCreate.addedRelations,
            bodyWithActionProfile.body.id,
          );
        },
      );
    },
  );

  JobProfiles.createJobProfileViaApi(testData.jobProfileForCreate).then((bodyWithjobProfile) => {
    testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
  });
});

// TODO redesign
Cypress.Commands.add('createOnePairMappingAndActionProfiles', (mappingProfile, actionProfile) => {
  FieldMappingProfiles.createMappingProfileViaApi(mappingProfile).then((bodyWithMappingProfile) => {
    actionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    SettingsActionProfiles.createActionProfileViaApi(actionProfile).then(
      (bodyWithActionProfile) => {
        cy.wrap(bodyWithActionProfile.body.id).as('idActionProfile');
      },
    );
  });
  return cy.get('@idActionProfile');
});

Cypress.Commands.add('dataImportGetJobByStatus', (jobStatus) => {
  return cy.okapiRequest({
    path: `metadata-provider/jobExecutions?limit=1&query=status==${jobStatus}`,
    isDefaultSearchParamsRequired: false,
  });
});
