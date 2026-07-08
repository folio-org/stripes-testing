import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Lists } from '../../../support/fragments/lists/lists';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import Modals from '../../../support/fragments/modals';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('fse-lists - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.sessionLocalePath,
      waiter: Localization.americanEnglishButtonWaitLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
    // change session locale to English (temporary action, won't affect tenant settings)
    Localization.selectAmericanEnglish();
    // close service point modal if it appears switching locale
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `TC195764 - verify that lists page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'lists', 'TC195764'] },
    () => {
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.LISTS);
      Lists.waitLoading();
      // check filters displayed
      Lists.waitForSpinnerToDisappear();
      Lists.filtersWaitLoading();
    },
  );
});

describe('fse-lists - UI (data manipulation)', () => {
  const listData = {
    name: getTestEntityValue('list'),
  };

  before('Create test data', () => {
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.listsPath,
      waiter: Lists.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  after('Delete test data', () => {
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    Lists.deleteListByNameViaApi(listData.name);
    cy.allure().logCommandSteps();
  });

  it(
    `TC196049 - verify lists creation for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'lists', 'nonProd', 'fse-user-journey', 'TC196049'] },
    () => {
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.selectRecordType('Loans');
      Lists.selectVisibility('Shared');
      Lists.selectStatus('Active');
      Lists.saveList();
      Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
      Lists.closeListDetailsPane();
      Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
        Lists.checkResultSearch(listData, rowIndex);
      });
    },
  );
});
