import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import { Pane } from '../../../interactors';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../support/dictionary/devTeams';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-requests: Make sure that request type filters are working properly', () => {
  const requests = [];
  const instances = [];
  const userIds = [];
  const requestTypes = { PAGE: 'Page', HOLD: 'Hold', RECALL: 'Recall' };
  const resetFiltersMessage = 'Choose a filter or enter a search query to show results.';
  const doesNotExistRequest = `notExist-${uuid()}`;
  const getNoResultMessage = (term) => `No results found for "${term}". Please check your spelling and filters.`;
  let addedCirculationRule;
  let originalCirculationRules;
  let loanTypeId;
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.HOLD, REQUEST_TYPES.PAGE, REQUEST_TYPES.RECALL],
    name: `autotestPolicy${getRandomPostfix()}`,
    id: uuid(),
  };

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken();
    cy.createLoanType({
      name: `type_${getRandomPostfix()}`,
    }).then((loanType) => {
      loanTypeId = loanType.id;

      RequestPolicy.createViaApi(requestPolicyBody);

      CirculationRules.getViaApi().then((circulationRule) => {
        originalCirculationRules = circulationRule.rulesAsText;
        const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
        ruleProps.r = requestPolicyBody.id;
        addedCirculationRule =
          't ' +
          loanTypeId +
          ': i ' +
          ruleProps.i +
          ' l ' +
          ruleProps.l +
          ' r ' +
          ruleProps.r +
          ' o ' +
          ruleProps.o +
          ' n ' +
          ruleProps.n;
        CirculationRules.addRuleViaApi(originalCirculationRules, ruleProps, 't ', loanTypeId);
      });
    });

    Object.values(requestTypes).forEach((requestType) => {
      const itemStatus =
        requestType === REQUEST_TYPES.PAGE
          ? ITEM_STATUS_NAMES.AVAILABLE
          : ITEM_STATUS_NAMES.CHECKED_OUT;
      Requests.createRequestApi(itemStatus, requestType).then(
        ({ instanceRecordData, createdRequest, createdUser }) => {
          requests.push(createdRequest);
          instances.push(instanceRecordData);
          userIds.push(createdUser.id);
        },
      );
    });
  });

  afterEach(() => {
    instances.forEach((instance) => {
      cy.deleteItemViaApi(instance.itemId);
      cy.deleteHoldingRecordViaApi(instance.holdingId);
      InventoryInstance.deleteInstanceViaApi(instance.instanceId);
    });
    requests.forEach((request) => {
      Requests.deleteRequestViaApi(request.id);
    });
    userIds.forEach((id) => {
      Users.deleteViaApi(id);
    });
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    cy.deleteLoanType(loanTypeId);
  });

  it(
    'C540 Make sure that request type filters are working properly (vega)',
    { tags: [TestTypes.smoke, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.requestsPath);
      // Apply filters and test that the appropriate results display
      requests.forEach(({ requestType }) => {
        Requests.checkRequestType(requestType);
        Requests.waitUIFilteredByRequestType();
        Requests.verifyIsFilteredByRequestType(requestType);
        Requests.resetAllFilters();
      });

      // Verify good message displayed when no results found
      requests.forEach(({ requestType }) => {
        Requests.checkRequestType(requestType);
        Requests.findCreatedRequest(doesNotExistRequest);
        Requests.verifyNoResultMessage(getNoResultMessage(doesNotExistRequest));
        Requests.resetAllFilters();
      });

      // Navigate to other apps and back to ensure the filters are saved
      requests.forEach(({ requestType }) => {
        Requests.checkRequestType(requestType);
        Requests.waitUIFilteredByRequestType();
        Requests.verifyIsFilteredByRequestType(requestType);
        Requests.navigateToApp('Data export');
        cy.expect(Pane({ title: 'Logs' }).exists());
        Requests.navigateToApp('Requests');
        Requests.verifyRequestTypeChecked(requestType);
        Requests.verifyIsFilteredByRequestType(requestType);
        Requests.resetAllFilters();
      });

      // Test reset all button
      requests.forEach(({ requestType }) => {
        Requests.checkRequestType(requestType);
        Requests.resetAllFilters();
        Requests.verifyNoResultMessage(resetFiltersMessage);
      });

      // Test that filters and search terms work well together
      requests.forEach(({ requestType, instance: { title } }) => {
        Requests.checkRequestType(requestType);
        Requests.waitUIFilteredByRequestType();
        Requests.findCreatedRequest(title);
        Requests.verifyCreatedRequest(title);
        Requests.resetAllFilters();
      });
    },
  );
});
