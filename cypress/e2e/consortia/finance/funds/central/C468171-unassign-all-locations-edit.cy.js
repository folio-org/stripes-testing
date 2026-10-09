import { Button } from '../../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Funds from '../../../../../support/fragments/finance/funds/funds';
import fundEditForm from '../../../../../support/fragments/finance/funds/fundEditForm';
import { ExecutionFlowManager } from '../../../../../support/utils';

import EcsFlow from '../../../../../support/fragments/finance/funds/ecs/restrictFundByLocationFlow';
import { ECS_FUND_LOCATION_KEYS as R } from '../../../../../support/fragments/finance/funds/ecs/constants';
import FundSearch from '../../../../../support/fragments/finance/funds/ecs/fundSearch';

describe('Consortia Finance', () => {
  describe('Funds', () => {
    const flow = new ExecutionFlowManager();

    before(() => {
      flow.init();

      cy.log('PRECONDITION 1: Central ordering setting enabled');
      // Env precondition.

      cy.log('PRECONDITION 2-3: FY and Ledger exist in Central');
      flow.step(() => EcsFlow.init(flow));
      flow.step(() => EcsFlow.createCentralFyLedger(flow));

      cy.log('PRECONDITION 4: restricted fund with at least 2 locations exists in Central');
      flow.step(() => EcsFlow.createLocationsCentral(flow, 2));
      flow.step(() => EcsFlow.createCentralRestrictedFund(flow, { useCentralCount: 2 }));

      cy.log('PRECONDITION 5-6: user affiliations central+member1+member2 + permissions');
      flow.step(() => EcsFlow.createEcsUser(
        flow,
        [Permissions.consortiaSettingsCentralOrderingView?.gui].filter(Boolean),
      ));

      cy.log('PRECONDITION 7: user on Finance Funds page (Central)');
      flow.step(() => {
        const user = flow.get(R.USER);
        cy.login(user.username, user.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      });
    });

    after(() => {
      flow.cleanup();
    });

    it(
      'C468171 ECS | Unassign all locations when editing a fund restricted by location in Central tenant',
      { tags: ['consortia', 'finance', 'funds', 'C468171'] },
      () => {
        const fund = flow.get(R.CENTRAL_FUND);

        cy.log('STEP 1: Search and open fund');
        FundSearch.searchByName(fund.name);
        Funds.selectFund(fund.name);
        Funds.waitForFundDetailsLoading();

        cy.log('STEP 1 expected: details pane + restrict checkbox checked');
        Funds.verifyCheckboxState('Restrict use by location', true);

        cy.log('STEP 2: Actions Edit');
        Funds.editFund();

        cy.log('STEP 2 expected: Locations accordion has 2 records; Add + Unassign all active');
        Funds.verifyUnassignAllLocationsButtonState(false);

        cy.log('STEP 3: Click Unassign all locations');
        Funds.clickUnassignAllLocationsButton();

        cy.log('STEP 3 expected: modal with text + Cancel + Submit');
        Funds.verifyUnassignAllLocationsModal();

        cy.log('STEP 4: Click Cancel in modal');
        Funds.selectActionInUnassignAllLocationsModal('cancel');

        cy.log('STEP 4 expected: modal closed; Locations still has 2 records');
        Funds.verifyUnassignAllLocationsButtonState(false);

        cy.log('STEP 5: Click Unassign all locations again');
        Funds.clickUnassignAllLocationsButton();
        Funds.verifyUnassignAllLocationsModal();

        cy.log('STEP 6: Click Submit');
        Funds.selectActionInUnassignAllLocationsModal('confirm');

        cy.log('STEP 6 expected: no locations found; Unassign inactive');
        Funds.verifyNoLocationsFound();
        Funds.verifyUnassignAllLocationsButtonState(true);

        cy.log('STEP 7: Click Cancel on edit page');
        Funds.cancelEditingFund();

        cy.log('STEP 7 expected: Are you sure modal with unsaved changes');
        Funds.verifyAreYouSureModal();

        cy.log('STEP 8: Close without saving');
        Funds.closeWithoutSaving();

        cy.log('STEP 8 expected: back to details pane; restrict checkbox checked');
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState('Restrict use by location', true);

        cy.log('STEP 9: Edit again; locations were not deleted');
        Funds.editFund();
        Funds.verifyUnassignAllLocationsButtonState(false);

        cy.log('STEP 10: Click Unassign all locations');
        Funds.clickUnassignAllLocationsButton();
        Funds.verifyUnassignAllLocationsModal();

        cy.log('STEP 11: Submit');
        Funds.selectActionInUnassignAllLocationsModal('confirm');
        Funds.verifyNoLocationsFound();
        Funds.verifyUnassignAllLocationsButtonState(true);

        cy.log('STEP 12: Cancel edit page');
        Funds.cancelEditingFund();
        Funds.verifyAreYouSureModal();

        cy.log('STEP 13: Keep editing');
        fundEditForm.keepEditingFund();

        cy.log('STEP 13 expected: edit page still open with no locations');
        Funds.verifyNoLocationsFound();

        cy.log('STEP 14: Save & close');
        cy.do(Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE).click());

        cy.log('STEP 14 expected: error Locations must be assigned; page not closed');
        Funds.varifyLocationRequiredError();
      },
    );
  });
});
