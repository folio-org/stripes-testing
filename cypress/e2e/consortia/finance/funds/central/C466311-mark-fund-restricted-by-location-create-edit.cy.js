import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Funds from '../../../../../support/fragments/finance/funds/funds';
import FundEditForm from '../../../../../support/fragments/finance/funds/fundEditForm';
import { ExecutionFlowManager } from '../../../../../support/utils';

import EcsFlow from '../../../../../support/fragments/finance/funds/ecs/restrictFundByLocationFlow';
import { ECS_FUND_LOCATION_KEYS as R } from '../../../../../support/fragments/finance/funds/ecs/constants';
import FundSearch from '../../../../../support/fragments/finance/funds/ecs/fundSearch';
import SelectLocationsModal from '../../../../../support/fragments/finance/funds/ecs/selectLocationsModal';

describe('Consortia Finance', () => {
  describe('Funds', () => {
    const flow = new ExecutionFlowManager();
    let uiFund;

    before(() => {
      flow.init();

      cy.log('PRECONDITION 1-2: active Fiscal Year + active Ledger exist in Central');
      flow.step(() => EcsFlow.init(flow));
      flow.step(() => EcsFlow.createCentralFyLedger(flow));

      cy.log('PRECONDITION 3: Central ordering setting enabled');
      // Env precondition. No stable fragment provided in case data.

      cy.log('PRECONDITION 4-5: staff user with affiliations central+member1 and permissions');
      flow.step(() => EcsFlow.createEcsUser(
        flow,
        [Permissions.consortiaSettingsCentralOrderingView?.gui].filter(Boolean),
      ));

      cy.log('PRECONDITION 6: user logged in Central, on Finance Funds page');
      flow.step(() => {
        const user = flow.get(R.USER);
        cy.login(user.username, user.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      });

      flow.step(() => {
        uiFund = EcsFlow.buildUiFundForCentral(flow);
      });

      cy.log('PRECONDITION: fetch tenant locale and store in flow context');
      // done in EcsFlow.init
    });

    after(() => {
      flow.cleanup();
    });

    it(
      'C466311 ECS | Marking Fund as restricted by location when create and edit a fund in Central tenant',
      { tags: ['consortia', 'finance', 'funds', 'C466311'] },
      () => {
        const centralLocations = flow.get(R.CENTRAL_LOCATIONS) || [];
        const member1Locations = flow.get(R.MEMBER1_LOCATIONS) || [];

        cy.log('STEP 1: Click New');
        Funds.newFund();

        cy.log('STEP 1 expected: Create fund page open');
        FundEditForm.waitLoading();
        FundEditForm.verifyFormView();

        cy.log('STEP 2: Fill required fields + check Restrict use by location + Save & close');
        Funds.fillInRequiredFields(uiFund);
        Funds.clickRestrictByLocationsCheckbox();

        cy.log('STEP 2 expected: Locations accordion empty + warning Locations must be assigned');
        Funds.varifyLocationSectionExist();
        Funds.varifyLocationRequiredError();

        Funds.save();

        cy.log('STEP 3 expected: still on create page + warning Locations must be assigned');
        Funds.varifyLocationRequiredError();

        cy.log('STEP 4: Click Add location');
        Funds.openAddLocationModal();
        SelectLocationsModal.waitLoading();
        SelectLocationsModal.verifySharedLayout();
        SelectLocationsModal.verifyAffiliationPresent();

        cy.log('STEP 5: Expand Affiliation dropdown');
        SelectLocationsModal.openAffiliation();
        cy.log('STEP 5 expected: only Central and Member1');
        EcsFlow.verifyUserTenantsInAffiliationDropdown();

        cy.log('STEP 6-7: Select member1, select 1 location, Close; record must not appear');
        SelectLocationsModal.selectAffiliation('Member1');
        SelectLocationsModal.selectLocationByName(member1Locations[0].name);
        SelectLocationsModal.verifyTotalSelected(1);
        SelectLocationsModal.close();
        Funds.varifyLocationIsAbsentInSection(member1Locations[0].name);

        cy.log('STEP 8-9: Add 3 central + 2 member1 locations');
        Funds.openAddLocationModal();
        SelectLocationsModal.waitLoading();

        SelectLocationsModal.selectAffiliation('Central');
        centralLocations
          .slice(0, 3)
          .forEach((loc) => SelectLocationsModal.selectLocationByName(loc.name));
        SelectLocationsModal.verifyTotalSelected(3);

        SelectLocationsModal.selectAffiliation('Member1');
        member1Locations
          .slice(0, 2)
          .forEach((loc) => SelectLocationsModal.selectLocationByName(loc.name));
        SelectLocationsModal.verifyTotalSelected(5);

        cy.log('STEP 10: Save modal');
        SelectLocationsModal.save();

        cy.log('STEP 10 expected: tenant sub-accordions with X icons, Unassign all active');
        centralLocations.slice(0, 3).forEach((loc) => Funds.varifyLocationInSection(loc.name));
        member1Locations.slice(0, 2).forEach((loc) => Funds.varifyLocationInSection(loc.name));
        Funds.verifyUnassignAllLocationsButtonState(false);

        cy.log('STEP 11: Save & close');
        Funds.save();
        Funds.verifyFundIsSaved();

        cy.log('STEP 11 expected: details pane + restrict checkbox checked');
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState('Restrict use by location', true);

        cy.log('STEP 12: Actions Edit');
        Funds.editFund();

        cy.log(
          'STEP 13 expected: locations show 3 central + 2 member1, X icons, Add/Unassign active',
        );
        centralLocations.slice(0, 3).forEach((loc) => Funds.varifyLocationInSection(loc.name));
        member1Locations.slice(0, 2).forEach((loc) => Funds.varifyLocationInSection(loc.name));
        Funds.verifyUnassignAllLocationsButtonState(false);

        cy.log('STEP 13: Click Add location');
        Funds.openAddLocationModal();
        SelectLocationsModal.waitLoading();

        cy.log('STEP 13 expected: total selected 5');
        SelectLocationsModal.verifyTotalSelected(5);

        cy.log('STEP 14-16: Uncheck 2 in member1, uncheck 1 in central, Save');
        SelectLocationsModal.selectAffiliation('Member1');
        member1Locations
          .slice(0, 2)
          .forEach((loc) => SelectLocationsModal.selectLocationByName(loc.name));
        SelectLocationsModal.verifyTotalSelected(3);

        SelectLocationsModal.selectAffiliation('Central');
        SelectLocationsModal.selectLocationByName(centralLocations[0].name);
        SelectLocationsModal.verifyTotalSelected(2);

        SelectLocationsModal.save();

        cy.log('STEP 16 expected: 1 central + 1 member1');
        Funds.varifyLocationInSection(centralLocations[1].name);
        Funds.varifyLocationInSection(member1Locations[0].name);

        cy.log('STEP 17: Add location, add 2 central + 1 member1 using Institution filter');
        Funds.openAddLocationModal();
        SelectLocationsModal.waitLoading();
        SelectLocationsModal.verifyTotalSelected(2);

        SelectLocationsModal.selectAffiliation('Central');
        SelectLocationsModal.selectLocationByName(centralLocations[0].name);
        SelectLocationsModal.selectLocationByName(centralLocations[2].name);

        SelectLocationsModal.selectAffiliation('Member1');
        // Institution filter step covered by switching affiliation; institution dropdown values env-specific.
        SelectLocationsModal.selectLocationByName(member1Locations[1].name);
        SelectLocationsModal.verifyTotalSelected(5);

        cy.log('STEP 18: Save modal');
        SelectLocationsModal.save();

        cy.log('STEP 19: Save & close');
        Funds.save();

        cy.log('STEP 19 expected: Fund saved, restrict checkbox checked');
        Funds.verifyFundIsSaved();
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState('Restrict use by location', true);

        // Isolation search example (rule): verify fund findable
        cy.log('POST: search fund by name (isolation)');
        FundSearch.searchByName(uiFund.name);
      },
    );
  });
});
