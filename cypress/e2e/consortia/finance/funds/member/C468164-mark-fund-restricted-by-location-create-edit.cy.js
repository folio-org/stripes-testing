import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Funds from '../../../../../support/fragments/finance/funds/funds';
import FundEditForm from '../../../../../support/fragments/finance/funds/fundEditForm';
import { ExecutionFlowManager } from '../../../../../support/utils';

import EcsFlow from '../../../../../support/fragments/finance/funds/ecs/restrictFundByLocationFlow';
import { ECS_FUND_LOCATION_KEYS as R } from '../../../../../support/fragments/finance/funds/ecs/constants';
import SelectLocationsModal from '../../../../../support/fragments/finance/funds/ecs/selectLocationsModal';

describe('Consortia Finance', () => {
  describe('Funds', () => {
    const flow = new ExecutionFlowManager();
    let uiFund;

    before(() => {
      flow.init();

      cy.log('PRECONDITION 1-2: active FY + Ledger exist in member1');
      flow.step(() => EcsFlow.init(flow));
      flow.step(() => EcsFlow.createMember1FyLedger(flow));

      cy.log('PRECONDITION 3: Central ordering setting enabled in Central');
      // Env precondition.

      cy.log('PRECONDITION 4-5: user affiliations central+member1+member2; logged in member1');
      flow.step(() => EcsFlow.createEcsUser(
        flow,
        [Permissions.consortiaSettingsCentralOrderingView?.gui].filter(Boolean),
      ));

      flow.step(() => {
        uiFund = EcsFlow.buildUiFundForMember1(flow);
      });

      flow.step(() => {
        const user = flow.get(R.USER);
        // login to member1 tenant
        cy.setTenant(Cypress.env('OKAPI_TENANT_MEMBER_1') || undefined);
        cy.login(user.username, user.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      });

      flow.step(() => EcsFlow.createLocationsMember1(flow, 3));
    });

    after(() => {
      flow.cleanup();
    });

    it(
      'C468164 ECS | Marking Fund as restricted by location when create and edit a fund in Member tenant',
      { tags: ['consortia', 'finance', 'funds', 'C468164'] },
      () => {
        const locations = flow.get(R.MEMBER1_LOCATIONS) || [];

        cy.log('STEP 1: Click New');
        Funds.newFund();

        cy.log('STEP 1 expected: Create fund page open');
        FundEditForm.waitLoading();
        FundEditForm.verifyFormView();

        cy.log('STEP 2: Fill required fields + check Restrict + Save & close');
        Funds.fillInRequiredFields(uiFund);
        Funds.clickRestrictByLocationsCheckbox();

        cy.log('STEP 2 expected: Locations accordion empty + Locations must be assigned warning');
        Funds.varifyLocationSectionExist();
        Funds.varifyLocationRequiredError();

        Funds.save();

        cy.log('STEP 3 expected: still on create page + warning');
        Funds.varifyLocationRequiredError();

        cy.log('STEP 4: Click Add location; Affiliation dropdown NOT displayed');
        Funds.openAddLocationModal();
        SelectLocationsModal.waitLoading();
        SelectLocationsModal.verifySharedLayout();
        SelectLocationsModal.verifyAffiliationAbsent();

        cy.log('STEP 5: Select 2 locations');
        SelectLocationsModal.selectLocationByName(locations[0].name);
        SelectLocationsModal.selectLocationByName(locations[1].name);

        cy.log('STEP 6 expected: Total selected 2');
        SelectLocationsModal.verifyTotalSelected(2);

        cy.log('STEP 7: Save modal; X icons + Unassign all active');
        SelectLocationsModal.save();
        Funds.verifyUnassignAllLocationsButtonState(false);

        cy.log('STEP 8: Save & close');
        Funds.save();

        cy.log('STEP 8 expected: details pane + toast + restrict checkbox checked');
        Funds.verifyFundIsSaved();
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState('Restrict use by location', true);

        cy.log('STEP 9: Actions Edit');
        Funds.editFund();

        cy.log('STEP 9 expected: checkbox checked, selected locations displayed');
        Funds.verifyCheckboxState('Restrict use by location', true);
        Funds.varifyLocationInSection(locations[0].name);
        Funds.varifyLocationInSection(locations[1].name);

        cy.log('STEP 9: Click Add location; pick Campus filter and select 1 more location');
        Funds.openAddLocationModal();
        SelectLocationsModal.waitLoading();
        SelectLocationsModal.selectLocationByName(locations[2].name);

        cy.log('STEP 9 expected: Total selected 3');
        SelectLocationsModal.verifyTotalSelected(3);

        cy.log('STEP 10: Save modal; 3 locations, no warning');
        SelectLocationsModal.save();
        Funds.varifyLocationInSection(locations[2].name);

        cy.log('STEP 11: Save & close');
        Funds.save();

        cy.log('STEP 11 expected: details pane + toast saved + restrict checked');
        Funds.verifyFundIsSaved();
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState('Restrict use by location', true);
      },
    );
  });
});
