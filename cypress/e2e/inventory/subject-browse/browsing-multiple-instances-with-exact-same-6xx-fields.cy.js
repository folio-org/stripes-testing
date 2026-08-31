import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import { FOLIO_SUBJECT_SOURCES } from '../../../support/fragments/settings/inventory/instances/subjectSources';
import { FOLIO_SUBJECT_TYPES } from '../../../support/fragments/settings/inventory/instances/subjectTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const subjectValue = `AT_C584547_Subject_${randomPostfix}`;
    const lcshSource = FOLIO_SUBJECT_SOURCES[0];
    const topicalTermType = FOLIO_SUBJECT_TYPES[6];
    const instanceTitlePrefix = 'AT_C584547_MarcBibInstance_';

    const instanceTitles = [
      `${instanceTitlePrefix}1_${randomPostfix}`,
      `${instanceTitlePrefix}2_${randomPostfix}`,
    ];

    const testData = {
      user: {},
      instanceId1: null,
      instanceId2: null,
    };

    const marcBibFields1 = [
      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
      { tag: '245', content: `$a ${instanceTitles[0]}`, indicators: ['1', '1'] },
      // 2nd indicator 0 = Library of Congress Subject Headings; tag 650 = Topical term
      { tag: '650', content: `$a ${subjectValue}`, indicators: ['\\', '0'] },
    ];

    const marcBibFields2 = [
      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
      { tag: '245', content: `$a ${instanceTitles[1]}`, indicators: ['1', '1'] },
      // 2nd indicator 0 = Library of Congress Subject Headings; tag 650 = Topical term
      { tag: '650', content: `$a ${subjectValue}`, indicators: ['\\', '0'] },
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C584547_');
      cy.then(() => {
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields1).then(
          (instanceId) => {
            testData.instanceId1 = instanceId;
          },
        );
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields2).then(
          (instanceId) => {
            testData.instanceId2 = instanceId;
          },
        );
      }).then(() => {
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId1);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId2);
    });

    it(
      'C584547 Browsing the multiple instances with the exact same 6xx fields (promin)',
      { tags: ['extendedPath', 'promin', 'C584547'] },
      () => {
        BrowseSubjects.waitForSubjectToAppear(subjectValue, { quantity: 2 });

        // Step 1: Browse by subject value; verify 1 row with Subject, source, and type
        BrowseSubjects.searchBrowseSubjects(subjectValue);
        BrowseSubjects.checkValueIsBold(subjectValue);
        BrowseSubjects.checkResultsWithSameSubject(subjectValue, 1, {
          subjectSourceValues: [lcshSource],
          subjectTypeValues: [topicalTermType],
          numberOfTitlesValues: [2],
        });

        // Step 2: Click hyperlink on any subject row; verify instances list shown
        BrowseSubjects.openInstance({ name: subjectValue });
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

        // Step 3: Select first instance; verify Subject accordion shows correct subject data
        InventoryInstances.selectInstanceByTitle(instanceTitles[1]);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openSubjectAccordion();
        InventoryInstance.verifyInstanceSubject(0, 0, subjectValue);
        InventoryInstance.verifyInstanceSubject(0, 1, lcshSource);
        InventoryInstance.verifyInstanceSubject(0, 2, topicalTermType);
      },
    );
  });
});
