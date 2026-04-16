import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import { CLASSIFICATION_IDENTIFIER_TYPES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

const deweyBrowseId = defaultClassificationBrowseIdsAlgorithms[1].id;
const deweyBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[1].algorithm;
const localClassificationTypeName = `AT_C449381_ClassifType_${getRandomPostfix()}`;
let localClassificationTypeId;

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const errorTextPart = "classification type IDs don't exist";
    before('Create test data', () => {
      cy.getAdminToken();
      ClassificationBrowse.updateIdentifierTypesAPI(deweyBrowseId, deweyBrowseAlgorithm, []);
      ClassificationIdentifierTypes.createViaApi({
        name: localClassificationTypeName,
        source: 'local',
      }).then((response) => {
        localClassificationTypeId = response.body.id;
      });
    });

    after('Restore data', () => {
      cy.getAdminToken();
      ClassificationBrowse.updateIdentifierTypesAPI(deweyBrowseId, deweyBrowseAlgorithm, []);
      ClassificationIdentifierTypes.deleteViaApi(localClassificationTypeId, { ignoreErrors: true });
    });

    it(
      'C449381 API | Browse configuration updated after local "Classification identifier type" is deleted (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C449381'] },
      () => {
        cy.then(() => {
          // Step 4: Update Dewey browse config to include localTypeId and Dewey type ID
          ClassificationBrowse.updateIdentifierTypesAPI(deweyBrowseId, deweyBrowseAlgorithm, [
            localClassificationTypeId,
            CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
          ]).then((response) => {
            expect(response.status).to.eq(200);
          });
        })
          .then(() => {
            // Step 5: Verify the GET config shows updated typeIds
            ClassificationBrowse.getClassigicationBrowseConfig().then(({ status, body }) => {
              expect(status).to.eq(200);
              const configIds = body.configs.map((c) => c.id);
              defaultClassificationBrowseIdsAlgorithms.forEach((config) => {
                expect(configIds).to.include(config.id);
              });
              const deweyConfig = body.configs.find((c) => c.id === deweyBrowseId);
              expect(deweyConfig.typeIds).to.include(localClassificationTypeId);
              expect(deweyConfig.typeIds).to.include(CLASSIFICATION_IDENTIFIER_TYPES.DEWEY);
            });
          })
          .then(() => {
            // Step 6: Delete the local classification identifier type
            ClassificationIdentifierTypes.deleteViaApi(localClassificationTypeId).then(
              (response) => {
                expect(response.status).to.eq(204);
              },
            );
          })
          .then(() => {
            // Step 7: Verify the config no longer contains the deleted type ID
            ClassificationBrowse.getClassigicationBrowseConfig().then(({ status, body }) => {
              expect(status).to.eq(200);
              const configIds = body.configs.map((c) => c.id);
              defaultClassificationBrowseIdsAlgorithms.forEach((config) => {
                expect(configIds).to.include(config.id);
              });
              const deweyConfig = body.configs.find((c) => c.id === deweyBrowseId);
              expect(deweyConfig.typeIds).to.not.include(localClassificationTypeId);
              expect(deweyConfig.typeIds).to.include(CLASSIFICATION_IDENTIFIER_TYPES.DEWEY);
            });
          })
          .then(() => {
            // Step 8: PUT with deleted typeId → expect 400 with error message
            ClassificationBrowse.updateIdentifierTypesAPI(
              deweyBrowseId,
              deweyBrowseAlgorithm,
              [localClassificationTypeId],
              { ignoreErrors: true },
            ).then((response) => {
              expect(response.status).to.eq(400);
              expect(JSON.stringify(response.body)).to.include(errorTextPart);
            });
          });
      },
    );
  });
});
