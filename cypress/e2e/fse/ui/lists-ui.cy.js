import TopMenu from '../../../support/fragments/topMenu';
import { Lists } from '../../../support/fragments/lists/lists';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('fse-lists - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.listsPath,
      waiter: Lists.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195764 - verify that lists page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'lists', 'TC195764'] },
    () => {
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
