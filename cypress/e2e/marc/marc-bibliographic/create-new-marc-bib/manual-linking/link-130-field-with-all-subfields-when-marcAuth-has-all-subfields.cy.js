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
            tag130: '130',
          },
          authorityHeading: `AT_C569595_MarcAuthority_${randomPostfix} Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work Form subdivision - General subdivision Chronological subdivision Geographic subdivision`,
          bibTitle: `AT_C569595_MarcBibInstance_${randomPostfix}`,
          authorityField130Content: `$a AT_C569595_MarcAuthority_${randomPostfix} $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x - General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          bibField130Content: `$a AT_C569595_MarcAuthority_${randomPostfix} $2 Source of heading or term (NR) $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $1 Real World Object URI (R) $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.UNIFORM_TITLE,
          searchQuery: `AT_C569595_MarcAuthority_${randomPostfix} Date of treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section of a work Arranged statement for music Name of part/section of a work Key for music Version Title of a work`,
          valid245IndicatorValue: '1',
        };

        const authData = {
          prefix: getRandomLetters(15),
          startWithNumber: '1',
        };

        const authorityFields = [
          {
            tag: testData.tags.tag130,
            content: testData.authorityField130Content,
            indicators: ['\\', '\\'],
          },
        ];

        const linkedFieldData = {
          tag: testData.tags.tag130,
          ind1: '\\',
          ind2: '\\',
          controlledLetterSubfields: `$a AT_C569595_MarcAuthority_${randomPostfix} $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work`,
          uncontrolledLetterSubfields:
            '$v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
          uncontrolledDigitSubfields:
            '$2 Source of heading or term (NR) $1 Real World Object URI (R) $6 Linkage $7 Data provenance $8 Field link and sequence number',
        };

        let userData = {};
        let createdInstanceId;
        let createdAuthorityId;

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569595_MarcAuthority');

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
          'C569595 Link "130" field with all subfields (except $0) when MARC authority 1XX has all subfields (except $t) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C569595'] },
          () => {
            // Step 1: Click on "Actions" button in second pane >> Select "New MARC bibliographic record" option
            InventoryInstance.newMarcBibRecord();

            // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
            // Step 3: Select any values from the dropdowns of "008" field which are highlighted in red
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 4: Fill in the "245" field with any valid value
            QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.bibTitle}`);

            // Step 5: Add "130" field by clicking on "+" icon and fill it as specified
            MarcAuthority.addNewField(4, testData.tags.tag130, testData.bibField130Content);

            // Step 6: Click on the "Link to MARC Authority record" icon next to "130" field
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag130);
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
            // Verify "130" field is linked and displayed same data as at step 7
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));
          },
        );
      });
    });
  });
});
