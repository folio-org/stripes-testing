import Affiliations from '../../../../support/dictionary/affiliations';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';

const testData = {
  dcbInstance: {
    uuid: '9d1b77e4-f02e-4b7f-b296-3f2042ddac54', // DCB instance with hardcoded id is created during env creation
  },
  dcbHoldings: {
    uuid: '10cd3a5a-d36f-4c7a-bc4f-e1ae3cf820c9', // DCB holdings with hardcoded id is created during env creation
  },
};

const collegeApiKey = Cypress.env('EDGE_COLLEGE_API_KEY');

describe('OAI-PMH', () => {
  describe('GetRecord', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Configure OAI-PMH settings', function () {
        // Skip test if Edge configuration is not available
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }

        // Configure OAI-PMH behavior for College tenant
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );

        cy.resetTenant();
      });

      after('Reset OAI-PMH settings', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Reset OAI-PMH behavior for College tenant
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi();

        cy.resetTenant();
      });

      it(
        'C1301738 Consortia | GetRecord: Verify that DCB Instance is NOT retrieved in response of single tenant harvest (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C1301738', 'nonParallel'] },
        () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          // Step 1: Send GetRecord request with marc21 format for DCB instance
          OaiPmhEdge.getRecordRequest(
            testData.dcbInstance.uuid,
            Affiliations.College,
            'marc21',
            collegeApiKey,
          ).then((response) => {
            OaiPmh.verifyIdDoesNotExistError(response);
          });

          // Step 2: Send GetRecord request with marc21_withholdings format for DCB instance
          OaiPmhEdge.getRecordRequest(
            testData.dcbInstance.uuid,
            Affiliations.College,
            'marc21_withholdings',
            collegeApiKey,
          ).then((response) => {
            OaiPmh.verifyIdDoesNotExistError(response);
          });

          // Step 3: Send GetRecord request with oai_dc format for DCB instance
          OaiPmhEdge.getRecordRequest(
            testData.dcbInstance.uuid,
            Affiliations.College,
            'oai_dc',
            collegeApiKey,
          ).then((response) => {
            OaiPmh.verifyIdDoesNotExistError(response);
          });
        },
      );
    });
  });
});
