import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import { FOLIO_SUBJECT_TYPES } from '../../../support/fragments/settings/inventory/instances/subjectTypes';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const subjectPrefix = `AT_C584508_${randomPostfix}`;
    const subjectTypeToFilter = FOLIO_SUBJECT_TYPES[1]; // Corporate name
    const subjectTypeAccordionName = 'Subject type';

    const testData = {
      user: {},
      instanceId: null,
    };

    const subjectValues = [
      `${subjectPrefix}_600 sub600b`,
      `${subjectPrefix}_600_1`,
      `${subjectPrefix}_600_2`,
      `${subjectPrefix}_610`,
      `${subjectPrefix}_611`,
      `${subjectPrefix}_630`,
      `${subjectPrefix}_647`,
      `${subjectPrefix}_648`,
      `${subjectPrefix}_650`,
      `${subjectPrefix}_651`,
      `${subjectPrefix}_655`,
    ];

    // indices 1 (610 \0, Corporate name + LCSH) and 3 (610 \2, Corporate name + MeSH)
    const corporateNameIndices = [1, 3];

    const marcBibFields = [
      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
      {
        tag: '245',
        content: `$a AT_C584508_MarcBibInstance_${randomPostfix}`,
        indicators: ['1', '1'],
      },
      // 2nd indicator 0 = Library of Congress Subject Headings; tag 600 = Personal name
      { tag: '600', content: `$a ${subjectPrefix}_600 $b sub600b`, indicators: ['\\', '0'] },
      // 2nd indicator 0 = Library of Congress Subject Headings; tag 610 = Corporate name
      { tag: '610', content: `$a ${subjectValues[1]}`, indicators: ['\\', '0'] },
      // 2nd indicator 4 = Source not specified; tag 600 = Personal name
      { tag: '600', content: `$a ${subjectValues[2]}`, indicators: ['\\', '4'] },
      // 2nd indicator 2 = Medical Subject Headings; tag 610 = Corporate name
      { tag: '610', content: `$a ${subjectValues[3]}`, indicators: ['\\', '2'] },
      // 2nd indicator 3 = National Agricultural Library; tag 611 = Meeting name
      { tag: '611', content: `$a ${subjectValues[4]}`, indicators: ['\\', '3'] },
      // 2nd indicator 4 = Source not specified; tag 630 = Uniform title
      { tag: '630', content: `$a ${subjectValues[5]}`, indicators: ['\\', '4'] },
      // 2nd indicator 5 = Canadian Subject Headings; tag 647 = Named event
      { tag: '647', content: `$a ${subjectValues[6]}`, indicators: ['\\', '5'] },
      // 2nd indicator 5 = Canadian Subject Headings; tag 648 = Chronological term
      { tag: '648', content: `$a ${subjectValues[7]}`, indicators: ['\\', '5'] },
      // 2nd indicator 6 = Répertoire de vedettes-matière; tag 650 = Topical term
      { tag: '650', content: `$a ${subjectValues[8]}`, indicators: ['\\', '6'] },
      // 2nd indicator 1 = LC Children's and Young Adults'; tag 651 = Geographic name
      { tag: '651', content: `$a ${subjectValues[9]}`, indicators: ['\\', '1'] },
      // 2nd indicator 7 = source in $2; tag 655 = Genre/form
      { tag: '655', content: `$a ${subjectValues[10]}`, indicators: ['\\', '7'] },
    ];

    const subjectTypesToSearch = [
      FOLIO_SUBJECT_TYPES[0], // Personal name
      FOLIO_SUBJECT_TYPES[1], // Corporate name
      FOLIO_SUBJECT_TYPES[2], // Meeting name
      FOLIO_SUBJECT_TYPES[3], // Uniform title
      FOLIO_SUBJECT_TYPES[4], // Named event
      FOLIO_SUBJECT_TYPES[5], // Chronological term
      FOLIO_SUBJECT_TYPES[6], // Topical term
      FOLIO_SUBJECT_TYPES[7], // Geographic name
      FOLIO_SUBJECT_TYPES[10], // Genre/form
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C584508_');
      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
        (instanceId) => {
          testData.instanceId = instanceId;
        },
      );
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C584508 Check filtering by folio Subject Type using only one condition (promin)',
      { tags: ['extendedPath', 'promin', 'C584508'] },
      () => {
        subjectValues.forEach((subjectValue) => {
          BrowseSubjects.waitForSubjectToAppear(subjectValue);
        });

        // Step 1: Browse with prefix; verify all subject values appear
        BrowseSubjects.searchBrowseSubjects(subjectPrefix);
        BrowseSubjects.verifyNonExistentSearchResult(subjectPrefix);
        subjectValues.forEach((subjectValue) => {
          BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(subjectValue);
        });

        // Step 2: Expand "Subject type" accordion; verify accordion expanded and dropdown active
        BrowseSubjects.verifyAccordionStatusByName(subjectTypeAccordionName, false);
        BrowseSubjects.expandAccordion(subjectTypeAccordionName);
        BrowseSubjects.verifyAccordionStatusByName(subjectTypeAccordionName, true);

        // Step 3: Click "Subject type" dropdown; verify all FOLIO types are displayed
        BrowseSubjects.verifySubjectTypeDropdownOptions(subjectTypesToSearch);

        // Step 4: Select "Corporate name"; verify only Corporate name results displayed
        BrowseSubjects.selectSubjectType(subjectTypeToFilter);
        subjectValues.forEach((subjectValue, index) => {
          if (corporateNameIndices.includes(index)) {
            BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(subjectValue);
          } else {
            BrowseSubjects.checkResultIsAbsent(subjectValue);
          }
        });
        BrowseSubjects.verifySearchResult(subjectTypeToFilter, subjectTypeAccordionName);
      },
    );
  });
});
