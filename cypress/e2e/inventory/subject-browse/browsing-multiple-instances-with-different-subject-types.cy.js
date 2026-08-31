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
import { or } from '../../../../interactors';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const subjectValue = `AT_C584545_Subject_${randomPostfix}`;
    const lcshSource = FOLIO_SUBJECT_SOURCES[0];
    const topicalTermType = FOLIO_SUBJECT_TYPES[6];
    const geographicNameType = FOLIO_SUBJECT_TYPES[7];

    const testData = {
      user: {},
      instanceId1: null,
      instanceId2: null,
    };

    const marcBibFields1 = [
      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
      {
        tag: '245',
        content: `$a AT_C584545_MarcBibInstance_1_${randomPostfix}`,
        indicators: ['1', '1'],
      },
      // 2nd indicator 0 = Library of Congress Subject Headings; tag 650 = Topical term
      { tag: '650', content: `$a ${subjectValue}`, indicators: ['\\', '0'] },
    ];

    const marcBibFields2 = [
      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
      {
        tag: '245',
        content: `$a AT_C584545_MarcBibInstance_2_${randomPostfix}`,
        indicators: ['1', '1'],
      },
      // 2nd indicator 0 = Library of Congress Subject Headings; tag 651 = Geographic name
      { tag: '651', content: `$a ${subjectValue}`, indicators: ['\\', '0'] },
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C584545_');
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
      'C584545 Browsing the multiple instances with different subject types (promin)',
      { tags: ['extendedPath', 'promin', 'C584545'] },
      () => {
        BrowseSubjects.waitForSubjectToAppear(subjectValue, { quantity: 2 });

        // Step 1: Browse by subject value; verify 2 rows with same Subject/source but different types
        BrowseSubjects.searchBrowseSubjects(subjectValue);
        BrowseSubjects.checkValueIsBold(subjectValue);
        BrowseSubjects.checkResultsWithSameSubject(subjectValue, 2, {
          subjectSourceValues: [lcshSource, lcshSource],
          subjectTypeValues: [geographicNameType, topicalTermType],
          numberOfTitlesValues: [1, 1],
        });

        // Step 2: Click hyperlink on any subject row; verify instances list shown
        BrowseSubjects.openInstance({ name: subjectValue });
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.waitLoading();

        // Step 3: Select first instance; verify Subject accordion shows correct subject data
        InventoryInstances.selectInstance(0);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openSubjectAccordion();
        InventoryInstance.verifyInstanceSubject(0, 0, subjectValue);
        InventoryInstance.verifyInstanceSubject(0, 1, lcshSource);
        InventoryInstance.verifyInstanceSubject(0, 2, or(geographicNameType, topicalTermType));
      },
    );
  });
});
