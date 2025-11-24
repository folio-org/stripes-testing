import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import { FOLIO_SUBJECT_TYPES } from '../../../support/fragments/settings/inventory/instances/subjectTypes';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C374704_FolioInstance_${randomPostfix}`,
      searchOption: searchInstancesOptions[12],
      subjectPrefix: `AT_C374704_Subject_${randomPostfix}`,
      subjectTypeName: FOLIO_SUBJECT_TYPES[1],
    };
    const instanceTitles = [
      `${testData.instanceTitlePrefix} A`,
      `${testData.instanceTitlePrefix} B`,
    ];
    const subjects = [
      `${testData.subjectPrefix} One Subject`,
      `${testData.subjectPrefix} Both Subject`,
    ];
    const instanceIds = [];
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C374704');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: instanceTitles[0],
              subjects: [{ value: subjects[0] }, { value: subjects[1] }],
            },
          }).then((instanceData) => {
            instanceIds.push(instanceData.instanceId);
          });
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: instanceTitles[1],
              subjects: [{ value: subjects[1] }],
            },
          }).then((instanceData) => {
            instanceIds.push(instanceData.instanceId);
          });
        });
      }).then(() => {
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C374704 Value in "Subject" column is a hyperlink (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C374704'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        BrowseSubjects.select();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventorySearchAndFilter.verifyResetAllButtonDisabled();

        subjects.forEach((subject) => {
          BrowseSubjects.waitForSubjectToAppear(subject);
        });
        InventorySearchAndFilter.fillInBrowseSearch(testData.subjectPrefix);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(testData.subjectPrefix);
        InventorySearchAndFilter.verifySearchButtonDisabled(false);
        InventorySearchAndFilter.verifyResetAllButtonDisabled(false);
        InventorySearchAndFilter.clickSearch();
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(subjects[0], 1);
        InventorySearchAndFilter.verifyEveryRowContainsLinkButtonInBrowse();

        cy.intercept('GET', '/search/instances*').as('getInstances1');
        BrowseSubjects.selectRecordByTitle(subjects[0]);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);
        InventorySearchAndFilter.checkSearchQueryText(subjects[0]);
        cy.wait('@getInstances1').then(({ request }) => {
          const url = new URL(request.url);
          const query = decodeURIComponent(url.searchParams.get('query'));
          expect(query).to.include('==/string');
        });

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(subjects[1], 2);

        cy.intercept('GET', '/search/instances*').as('getInstances2');
        BrowseSubjects.selectRecordByTitle(subjects[1]);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(2);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);
        InventorySearchAndFilter.checkSearchQueryText(subjects[1]);
        cy.wait('@getInstances2').then(({ request }) => {
          const url = new URL(request.url);
          const query = decodeURIComponent(url.searchParams.get('query'));
          expect(query).to.include('==/string');
        });
      },
    );
  });
});
