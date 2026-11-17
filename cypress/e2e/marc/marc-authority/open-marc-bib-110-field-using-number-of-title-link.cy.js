import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomFourDigitNumber();
    const testData = {
      tag008: '008',
      tag110: '110',
      tag245: '245',
      authorityHeading: `AT_C375261_MarcAuthority_${randomPostfix}`,
      instanceTitle: `AT_C375261_MarcBibInstance_${randomPostfix}`,
      searchOption: 'Corporate/Conference name',
    };
    const field110Content = `$a ${testData.authorityHeading}`;

    const authData = {
      prefix: getRandomLetters(15),
      startWithNumber: `375261${randomDigits}${randomDigits}`,
    };

    const authorityFields = [
      { tag: testData.tag110, content: field110Content, indicators: ['2', '\\'] },
    ];

    const marcBibFields = [
      { tag: testData.tag008, content: QuickMarcEditor.defaultValid008Values },
      { tag: testData.tag245, content: `$a ${testData.instanceTitle}`, indicators: ['1', '0'] },
      { tag: testData.tag110, content: field110Content, indicators: ['2', '\\'] },
    ];

    let createdAuthorityId;
    let createdInstanceId;

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375261_');

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.then(() => {
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;
            },
          );

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFields,
          ).then((createdRecordId) => {
            createdAuthorityId = createdRecordId;
          });
        })
          .then(() => {
            // Precondition: bib 110 is linked to authority 110
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: createdInstanceId,
              authorityIds: [createdAuthorityId],
              bibFieldTags: [testData.tag110],
              authorityFieldTags: [testData.tag110],
              finalBibFieldContents: [field110Content],
            });
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      MarcAuthority.deleteViaAPI(createdAuthorityId, true);
    });

    it(
      'C375261 "Number of titles" link in "MARC authority" app opens linked "MARC bib" record with controlled "110" field (promin)',
      { tags: ['criticalPath', 'promin', 'C375261'] },
      () => {
        // Step 1: Browse by "Corporate/Conference name"; the authorized row has 1 title
        MarcAuthorities.switchToBrowse();
        MarcAuthorities.searchByParameter(testData.searchOption, testData.authorityHeading);
        MarcAuthorities.checkRow(testData.authorityHeading);
        MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.authorityHeading, '1');
        // Step 2: Click the number of titles; the linked MARC bib record opens in Inventory
        MarcAuthorities.clickNumberOfTitlesByHeading(testData.authorityHeading);
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        InventoryInstance.checkPresentedText(testData.instanceTitle);
      },
    );
  });
});
