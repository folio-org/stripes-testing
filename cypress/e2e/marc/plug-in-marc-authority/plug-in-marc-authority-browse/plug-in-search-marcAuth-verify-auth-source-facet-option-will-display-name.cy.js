import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import {
  DEFAULT_FOLIO_AUTHORITY_FILES,
  MARC_AUTHORITY_BROWSE_OPTIONS,
} from '../../../../support/constants';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const randomDigits = `366586${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag010: '010',
        tag008: '008',
        tag100: '100',
        tag245: '245',
        bibTitle: `AT_C366586_MarcBibInstance_${randomPostfix}`,
        authorityheadingPrefix: `AT_C366586_MarcAuthority_${randomPostfix}`,
        bibTag100Content: `C366586 Contributor ${randomPostfix}`,
        sourceFilePrefixes: [
          'aat',
          'fst',
          'gsafd',
          'sj',
          'dg',
          'gf',
          'mp',
          'n',
          'sh',
          'D',
          'rbmscv',
          'lctgm',
          getRandomLetters(15),
        ],
        user: {},
      };

      const authData = {
        prefix: getRandomLetters(15),
        startsWithNumber: 1,
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag100,
          content: `$a ${testData.bibTag100Content}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      const createdAuthorityIds = [];
      let createdInstanceId;

      before('Create test data and login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C366586_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          testData.sourceFilePrefixes.forEach((sourceFilePrefix, index) => {
            const marcAuthorityFields = [
              {
                tag: testData.tag010,
                content: `$a ${sourceFilePrefix}${randomDigits}`,
                indicators: ['\\', '\\'],
              },
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityheadingPrefix} ${index}`,
                indicators: ['1', '\\'],
              },
            ];
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startsWithNumber + index}`,
              marcAuthorityFields,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });
          });
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          Users.deleteViaApi(testData.user.userId);
        });
      });

      it(
        'C366586 MARC Authority plug-in | Browse: Verify that the "Authority source" facet option will display the name of facet option when zero results are returned (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C366586'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorityBrowse.checkResultWithNoValue(testData.bibTag100Content);
          MarcAuthorityBrowse.clickResetAllAndCheck();
          MarcAuthorities.checkAuthoritySourceOptionsInPlugInModal();

          MarcAuthorities.chooseAuthoritySourceOption(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS,
          );
          MarcAuthorities.checkSelectedAuthoritySource(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS,
          );

          MarcAuthorities.selectSearchOptionInDropdown(MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME);
          MarcAuthorities.checkSelectOptionFieldContent(
            MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
          );

          MarcAuthorities.searchBeats(testData.authorityheadingPrefix);
          MarcAuthorities.verifyEmptySearchResults(testData.authorityheadingPrefix);
          MarcAuthorities.checkTotalRecordsForOptionInPlugInModal(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS,
            0,
          );

          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);
          MarcAuthorities.checkSearchQuery('');
          InteractorsTools.checkNoErrorCallouts();
        },
      );
    });
  });
});
