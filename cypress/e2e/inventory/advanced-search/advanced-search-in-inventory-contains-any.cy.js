import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { ADVANCED_SEARCH_MODIFIERS } from '../../../support/constants';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = `auto${getRandomLetters(8)}`;
    const testData = {
      advSearchOption: 'Advanced search',
      titleAllOpton: 'Title (all)',
      subjectOption: 'Subject',
      adminNotesOption: 'Instance administrative notes',
      titlePrefix: `AT_C422019_FolioInstance_${randomPostfix}`,
    };
    const instances = [
      {
        title: `${testData.titlePrefix} Instance_1`,
        adminNote: `Admin note ${randomLetters}ascaone`,
      },
      {
        title: `${testData.titlePrefix} Instance_2`,
        adminNote: `Admin note ${randomLetters}ascatwo`,
      },
      {
        title: `${testData.titlePrefix} Instance_3`,
        subject: `${randomLetters}ascasubjone and more`,
      },
      {
        title: `${testData.titlePrefix} Instance_4`,
        subject: `${randomLetters}ascasubjtwo and more`,
      },
      {
        title: `${testData.titlePrefix} ${randomLetters}containsanyone`,
      },
      {
        title: `${testData.titlePrefix} ${randomLetters}containsanytwo`,
      },
      {
        title: `${testData.titlePrefix} ${randomLetters}contanynotfoundone`,
        subject: `${randomLetters}ascasubjtwo and more`,
      },
      {
        title: `${testData.titlePrefix} ${randomLetters}contanynotfoundtwo`,
        adminNote: `${randomLetters}ascatwo`,
      },
    ];
    const expectedResults = instances.map((instance) => instance.title).slice(0, -2);
    const notExpectedResults = instances.map((instance) => instance.title).slice(-2);
    const advSearchData = [
      {
        query: `${randomLetters}containsanyone ${randomLetters}containsanytwo`,
        option: testData.titleAllOpton,
      },
      {
        query: `${randomLetters}ascaone ${randomLetters}ascatwo`,
        option: testData.adminNotesOption,
        operator: 'OR',
      },
      {
        query: `${randomLetters}ascasubjone ${randomLetters}ascasubjtwo`,
        option: testData.subjectOption,
        operator: 'OR',
      },
      {
        query: `${randomLetters}contanynotfoundone ${randomLetters}contanynotfoundtwo`,
        option: testData.titleAllOpton,
        operator: 'NOT',
      },
    ];
    const createdRecordIds = [];

    before('Creating data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
        })
        .then(() => {
          instances.forEach((instance) => {
            const instanceData = {
              instanceTypeId: testData.instanceTypeId,
              title: instance.title,
            };
            if (instance.adminNote) instanceData.administrativeNotes = [instance.adminNote];
            if (instance.subject) instanceData.subjects = [{ value: instance.subject }];
            InventoryInstances.createFolioInstanceViaApi({
              instance: instanceData,
            }).then((createdInstanceData) => {
              createdRecordIds.push(createdInstanceData.instanceId);
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
    });

    after('Deleting data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        createdRecordIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });
    });

    it(
      'C422019 Search Instances using "Contains any" search modifier/matcher (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422019'] },
      () => {
        InventoryInstances.clickAdvSearchButton();
        advSearchData.forEach((data, index) => {
          InventoryInstances.fillAdvSearchRow(
            index,
            data.query,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
            data.option,
            data.operator,
          );
          InventoryInstances.checkAdvSearchModalValues(
            index,
            data.query,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
            data.option,
            data.operator,
          );
        });
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        expectedResults.forEach((title) => {
          InventorySearchAndFilter.verifySearchResult(title);
        });
        InventorySearchAndFilter.checkRowsCount(expectedResults.length);
        notExpectedResults.forEach((title) => {
          InventorySearchAndFilter.verifySearchResult(title, false);
        });
      },
    );
  });
});
