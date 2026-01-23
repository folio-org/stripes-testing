import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          tags: {
            tag245: '245',
            tag100: '100',
          },
          authorityHeading: `AT_C569576_MarcAuthority_${randomPostfix} 1498-1578 best coin gas query--volume--xfiles--yum--zet`,
          bibTitle: `AT_C569576_MarcBibInstance_${randomPostfix}`,
          authorityField100Content: `$a AT_C569576_MarcAuthority_${randomPostfix} $d 1498-1578 $b best $c coin $e empty $f fun $h hot $j joy $g gas $k key $l low $m medium $n no $o ops $p poem $q query $r row $s stay $v volume $x xfiles $y yum $z zet $6 six $7 seven $8 8`,
          bibField100Content: `$a AT_C569576_MarcAuthority_${randomPostfix} $d 1498-1578 $b best $c coin $j joy $q query $f fun $g gas $k key $l low $n no $p poem $t test $u ups`,
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
          searchQuery: `AT_C569576_MarcAuthority_${randomPostfix} 1498-1578 test`,
          valid245IndicatorValue: '1',
        };

        const authData = {
          prefix: getRandomLetters(15),
          startWithNumber: '1',
        };

        const authorityFields = [
          {
            tag: testData.tags.tag100,
            content: testData.authorityField100Content,
            indicators: ['1', '\\'],
          },
        ];

        const linkedFieldData = {
          tag: testData.tags.tag100,
          ind1: '\\',
          ind2: '\\',
          controlledLetterSubfields: `$a AT_C569576_MarcAuthority_${randomPostfix} $d 1498-1578 $b best $c coin $j joy $q query`,
          uncontrolledLetterSubfields: '$f fun $g gas $k key $l low $n no $p poem $t test $u ups',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
          uncontrolledDigitSubfields: '',
        };

        let userData = {};
        let createdInstanceId;
        let createdAuthorityId;

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569576_MarcAuthority');

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber,
              authorityFields,
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;
            });

            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after(() => {
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C569576 Link "100" field with all subfields (except $0) when MARC authority 1XX has all subfields (except $t) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C569576'] },
          () => {
            // Step 1: Click on "Actions" button in second pane >> Select "New MARC bibliographic record" option
            InventoryInstance.newMarcBibRecord();

            // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
            // Step 3: Select any values from the dropdowns of "008" field which are highlighted in red
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 4: Fill in the "245" field with any valid value
            QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.bibTitle}`);

            // Step 5: Add "100" field by clicking on "+" icon and fill it as specified
            MarcAuthority.addNewField(4, testData.tags.tag100, testData.bibField100Content);

            // Step 6: Click on the "Link to MARC Authority record" icon next to "100" field
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag100);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();

            // Step 7: Click on the "Link" icon
            MarcAuthorities.clickLinkButton();
            // Verify the linked field structure
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));

            // Step 8: Click on the "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            cy.url().then((url) => {
              createdInstanceId = url.split('/')[5].split('?')[0];
            });

            // Step 9: Click on "Actions" button in third pane >> Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            // Verify "100" field is linked and displayed same data as at step 7
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));
          },
        );
      });
    });
  });
});
