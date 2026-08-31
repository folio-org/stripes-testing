import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import { FOLIO_SUBJECT_SOURCES } from '../../../support/fragments/settings/inventory/instances/subjectSources';
import { FOLIO_SUBJECT_TYPES } from '../../../support/fragments/settings/inventory/instances/subjectTypes';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const subjectPrefix = `AT_C584515_${randomPostfix}`;
    const subjectSourceToFilter = 'Library of Congress Subject Headings';
    const subjectTypeToFilter = 'Personal name';
    const subjectSourceAccordionName = 'Subject source';
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

    const subjectTypesAfterFiltering = [
      FOLIO_SUBJECT_TYPES[0], // Personal name
      FOLIO_SUBJECT_TYPES[1], // Corporate name
    ];

    const marcBibFields = [
      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
      {
        tag: '245',
        content: `$a AT_C584515_MarcBibInstance_${randomPostfix}`,
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

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C584515_');
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
      'C584515 Check filtering by Subject Source and Subject type (promin)',
      { tags: ['extendedPath', 'promin', 'C584515'] },
      () => {
        subjectValues.forEach((subjectValue) => {
          BrowseSubjects.waitForSubjectToAppear(subjectValue);
        });
        // Step 1: Browse with prefix query; verify results with subject headings appear
        BrowseSubjects.searchBrowseSubjects(subjectPrefix);
        subjectValues.forEach((subjectValue) => {
          BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(subjectValue);
        });

        // Step 2: Expand "Subject source" accordion; verify accordion expanded and dropdown active
        BrowseSubjects.verifyAccordionStatusByName(subjectSourceAccordionName, false);
        BrowseSubjects.expandAccordion(subjectSourceAccordionName);
        BrowseSubjects.verifyAccordionStatusByName(subjectSourceAccordionName, true);

        // Step 3: Click "Subject source" dropdown; verify all FOLIO sources are displayed
        BrowseSubjects.verifySubjectSourceDropdownOptions(FOLIO_SUBJECT_SOURCES);

        // Step 4: Select "Library of Congress Subject Headings"; verify filtered results
        BrowseSubjects.selectSubjectSource(subjectSourceToFilter);
        subjectValues.forEach((subjectValue, index) => {
          if (![0, 1].includes(index)) BrowseSubjects.checkResultIsAbsent(subjectValue);
          else BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(subjectValue);
        });

        // Step 5: Expand "Subject type" accordion; verify accordion expanded and dropdown active
        BrowseSubjects.verifyAccordionStatusByName(subjectTypeAccordionName, false);
        BrowseSubjects.expandAccordion(subjectTypeAccordionName);
        BrowseSubjects.verifyAccordionStatusByName(subjectTypeAccordionName, true);

        // Step 6: Click "Subject type" dropdown; verify all FOLIO types are displayed
        BrowseSubjects.verifySubjectTypeDropdownOptions(subjectTypesAfterFiltering);

        // Step 7: Select "Personal name"; verify results match both source and type filters
        BrowseSubjects.selectSubjectType(subjectTypeToFilter);
        subjectValues.forEach((subjectValue, index) => {
          if (index) BrowseSubjects.checkResultIsAbsent(subjectValue);
          else BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(subjectValue);
        });
        BrowseSubjects.verifySearchResult(subjectSourceToFilter, subjectSourceAccordionName);
        BrowseSubjects.verifySearchResult(subjectTypeToFilter, subjectTypeAccordionName);
      },
    );
  });
});
