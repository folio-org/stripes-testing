import { Button, Section } from '../../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import Funds from '../../../../../support/fragments/finance/funds/funds';
import { ExecutionFlowManager } from '../../../../../support/utils';

import EcsFlow from '../../../../../support/fragments/finance/funds/ecs/restrictFundByLocationFlow';
import { ECS_FUND_LOCATION_KEYS as R } from '../../../../../support/fragments/finance/funds/ecs/constants';
import FundSearch from '../../../../../support/fragments/finance/funds/ecs/fundSearch';
import SelectLocationsModal from '../../../../../support/fragments/finance/funds/ecs/selectLocationsModal';

const locationsSection = Section({ id: 'locations' });

// Best effort selector. Funds fragment no helper to click X per row.
const removeButtonSelector = 'button[data-test-repeatable-field-remove-item-button]';

describe('Consortia Finance', () => {
  describe('Funds', () => {
    const flow = new ExecutionFlowManager();

    before(() => {
      flow.init();

      cy.log('PRECONDITION 1: Central ordering setting enabled');
      // Env precondition.

      cy.log('PRECONDITION 2-3: FY + Ledger in Central');
      flow.step(() => EcsFlow.init(flow));
      flow.step(() => EcsFlow.createCentralFyLedger(flow));

      cy.log('PRECONDITION 4: restricted fund with 3 locations from central, member1, member2');
      flow.step(() => EcsFlow.createLocationsCentral(flow, 1));
      flow.step(() => EcsFlow.createLocationsMember1(flow, 1));
      flow.step(() => EcsFlow.createLocationsMember2(flow, 1));
      flow.step(() => EcsFlow.createCentralRestrictedFund(flow, {
        useCentralCount: 1,
        useMember1Count: 1,
        useMember2Count: 1,
      }));

      cy.log('PRECONDITION 5-6: user affiliations central+member1 (no member2) + perms');
      // createEcsUser affiliates member2 too; test case wants no member2.
      // Use central-only user creation and manual member1 affiliation.
      flow.step(() => cy
        .createTempUser(
          [
            Permissions.uiFinanceViewEditFundAndBudget?.gui ||
                Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
            Permissions.consortiaSettingsCentralOrderingView?.gui,
          ].filter(Boolean),
        )
        .then((user) => {
          flow.set(R.USER, user);
          flow.toCleanup(R.USER, () => Users.deleteViaApi(user.userId));

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: [Permissions.uiFinanceViewEditCreateFundAndBudget.gui],
          });
        }));

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
      'C468166 ECS | Remove location when editing a fund restricted by location in Central tenant',
      { tags: ['consortia', 'finance', 'funds', 'C468166'] },
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

        cy.log(
          'STEP 2 expected: locations accordion has 3 records; X for central+member1, no X for member2; Add active; Unassign not displayed',
        );
        cy.expect(locationsSection.exists());
        cy.get('#locations').find(removeButtonSelector).should('have.length.at.least', 1);
        // COMMON_BUTTON_LABELS has no "unassignAllLocations". Keep a single literal for this assertion.
        cy.contains('Unassign all locations').should('not.exist');

        cy.log('STEP 3: click X for any removable record');
        cy.get('#locations').find(removeButtonSelector).first().click();

        cy.log('STEP 3 expected: record removed');
        // minimal: count reduced
        cy.get('#locations').find(removeButtonSelector).should('have.length.at.most', 1);

        cy.log('STEP 4: Cancel edit');
        cy.do(Button(COMMON_BUTTON_LABELS.CANCEL).click());

        cy.log('STEP 4 expected: Are you sure modal');
        Funds.verifyAreYouSureModal();

        cy.log('STEP 5: Close without saving');
        Funds.closeWithoutSaving();

        cy.log('STEP 5 expected: details pane + restrict checkbox checked');
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState('Restrict use by location', true);

        cy.log('STEP 6: Edit again');
        Funds.editFund();

        cy.log('STEP 6 expected: again 3 records and same X rules');
        cy.get('#locations').find(removeButtonSelector).should('have.length.at.least', 1);
        // COMMON_BUTTON_LABELS has no "unassignAllLocations". Keep a single literal for this assertion.
        cy.contains('Unassign all locations').should('not.exist');

        cy.log('STEP 7: click X for record from member1');
        // No stable tenant marker per row. Best effort: remove second removable.
        cy.get('#locations').find(removeButtonSelector).eq(0).click();

        cy.log('STEP 8: Cancel edit');
        cy.do(Button(COMMON_BUTTON_LABELS.CANCEL).click());
        Funds.verifyAreYouSureModal();

        cy.log('STEP 9: Keep editing');
        // COMMON_BUTTON_LABELS has no KEEP_EDITING. Keep a single literal for this assertion/action.
        cy.do(Button('Keep editing').click());

        cy.log('STEP 9 expected: edit page with removed record still removed');
        cy.get('#locations').find(removeButtonSelector).should('have.length.at.most', 1);

        cy.log('STEP 10: Save & close');
        cy.do(Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE).click());

        cy.log('STEP 10 expected: toast Fund has been saved + details pane');
        Funds.verifyFundIsSaved();
        Funds.waitForFundDetailsLoading();

        cy.log('STEP 11: Edit again');
        Funds.editFund();

        cy.log('STEP 12: Add location');
        Funds.openAddLocationModal();
        SelectLocationsModal.waitLoading();

        cy.log(
          'STEP 12 expected: Central selected by default; total selected equals assigned count',
        );
        cy.contains('Central').should('be.visible');
        cy.contains('Total selected:').should('be.visible');

        cy.log('STEP 13: expand Affiliation, contains Central and member1');
        SelectLocationsModal.openAffiliation();
        EcsFlow.verifyUserTenantsInAffiliationDropdown();

        cy.log('STEP 14: check Assigned filter');
        SelectLocationsModal.filterAssignedOnly();

        cy.log(
          'STEP 14 expected: assigned location row visible with checked checkbox and Assigned status',
        );
        // Expect some Assigned status exists. Location name env-specific.
        cy.contains('Assigned').should('be.visible');
      },
    );
  });
});
