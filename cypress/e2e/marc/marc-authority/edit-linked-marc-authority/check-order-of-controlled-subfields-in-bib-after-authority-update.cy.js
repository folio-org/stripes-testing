import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit linked MARC authority', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `397388${randomNDigitNumber(15)}`;

      const testData = {
        tag008: '008',
        tag010: '010',
        tag110: '110',
        tag151: '151',
        tag240: '240',
        tag245: '245',
        tag651: '651',

        // Authority 1 (110 with $t → links to bib 240)
        auth1NaturalId: `n${randomDigits}1`,
        auth1Heading: `AT_C605927_MarcAuthority_Egypt_${randomPostfix}`,
        auth1Tag110Content: `$a AT_C605927_MarcAuthority_Egypt_${randomPostfix}. $t AT_C605927_MarcAuthority_Treaties_${randomPostfix}, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East) $n numbe2 $g Egypt $d 2015`,
        auth1Tag110UpdatedContent: `$a AT_C605927_MarcAuthority_Egypt_${randomPostfix}. $d 220 $t AT_C605927_MarcAuthority_Treaties_${randomPostfix}, etc. $g Israel, $n numbe2 $g Egypt $d 2015`,

        // Authority 2 (151 → links to bib 651)
        auth2NaturalId: `sh${randomDigits}2`,
        auth2NaturalIdUpdated: `sh${randomDigits}21`,
        auth2Tag151Content: `$a AT_C605927_MarcAuthority_UnitedStates_${randomPostfix} $z USA $x History $y Civil War, 1861-1865 $x Cavalry operations`,
        auth2Tag151AfterFirstEdit: `$a AT_C605927_MarcAuthority_UnitedStates of America_${randomPostfix} $z USA $x History $y Civil War, 1861-1865 $x Cavalry operations $y Independence war`,
        auth2Tag151AfterSecondEdit: `$a AT_C605927_MarcAuthority_UnitedStates of America_${randomPostfix} $z USA $x Hist $y Civil War, 1861-1865 $x Cavalry operations $y Independence war`,

        bibTitle: `AT_C605927_MarcBibInstance_${randomPostfix}`,

        // Uncontrolled subfields for bib 240
        bib240UncontrolledAlpha: '$e Country $v sub1 $e Area',
        bib240UncontrolledDigit: '$8 240 $6 Link',

        // Uncontrolled subfields for bib 651
        bib651UncontrolledAlpha:
          '$x History $e Country $b States $e USA $y Civil War, 1861-1865 $x Cavalry operations',
        bib651UncontrolledDigit: '$8 number801 $1 URI1 $8 number802',

        auth1NaturalIdUrl: 'http://id.loc.gov/authorities/names/',
        auth2NaturalIdUrl: 'http://id.loc.gov/authorities/subjects/',
      };

      // Initial controlled content in bib 240 when linked to authority 110 with $t
      // (authority 110 $t maps to bib 240 $a; other 1XX subfields map to bib 240 same subfields)
      const bib240InitialControlled = `$a AT_C605927_MarcAuthority_Treaties_${randomPostfix}, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East) $n numbe2 $g Egypt $d 2015`;
      const bib651InitialControlled = `$a AT_C605927_MarcAuthority_UnitedStates_${randomPostfix}`;

      // finalBibFieldContents includes both controlled and uncontrolled subfields
      // so uncontrolled parts are stored in SRS from the initial link
      const bib240FinalContent = `${bib240InitialControlled} ${testData.bib240UncontrolledAlpha} ${testData.bib240UncontrolledDigit}`;
      const bib651FinalContent = `${bib651InitialControlled} ${testData.bib651UncontrolledAlpha} ${testData.bib651UncontrolledDigit}`;

      // Expected bib 240 field data after all authority 1 edits (step 16)
      const linkedField240Data = {
        tag: testData.tag240,
        ind1: '1',
        ind2: '0',
        controlledContent: `$a AT_C605927_MarcAuthority_Treaties_${randomPostfix}, etc. $d 220 $g Israel, $n numbe2 $g Egypt $d 2015`,
        uncontrolledAlpha: testData.bib240UncontrolledAlpha,
        uncontrolledDigit: testData.bib240UncontrolledDigit,
      };

      // Expected bib 651 field data after all authority 2 edits (step 17)
      const linkedField651Data = {
        tag: testData.tag651,
        ind1: '\\',
        ind2: '0',
        controlledContent: `$a AT_C605927_MarcAuthority_UnitedStates of America_${randomPostfix}`,
        uncontrolledAlpha: testData.bib651UncontrolledAlpha,
        uncontrolledDigit: testData.bib651UncontrolledDigit,
      };

      // Step 19: expected subfield order in MARC source view
      // Test case order: controlled → uncontrolledAlpha → $0 → $9[uuid] → uncontrolledDigit
      const field240SourceOrder = `${linkedField240Data.controlledContent} ${testData.bib240UncontrolledAlpha} $0 ${testData.auth1NaturalIdUrl}${testData.auth1NaturalId}`;
      const field651SourceOrder = `${linkedField651Data.controlledContent} ${testData.bib651UncontrolledAlpha} $0 ${testData.auth2NaturalIdUrl}${testData.auth2NaturalIdUpdated}`;

      let userData;
      let auth1Id;
      let auth2Id;
      let createdBibId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C605927_');

        cy.then(() => {
          // Create authority 1 (110 with $t, links to bib 240)
          MarcAuthorities.createMarcAuthorityViaAPI('', testData.auth1NaturalId, [
            {
              tag: testData.tag010,
              content: `$a ${testData.auth1NaturalId}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag110,
              content: testData.auth1Tag110Content,
              indicators: ['1', '\\'],
            },
          ]).then((authorityId) => {
            auth1Id = authorityId;
          });

          // Create authority 2 (151, links to bib 651)
          MarcAuthorities.createMarcAuthorityViaAPI('', testData.auth2NaturalId, [
            {
              tag: testData.tag010,
              content: `$a ${testData.auth2NaturalId}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag151,
              content: testData.auth2Tag151Content,
              indicators: ['\\', '\\'],
            },
          ]).then((authorityId) => {
            auth2Id = authorityId;
          });

          // Create MARC bib with 240 and 651 placeholder fields
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
            { tag: testData.tag008, content: QuickMarcEditor.valid008ValuesInstance },
            {
              tag: testData.tag245,
              content: `$a ${testData.bibTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: testData.tag240,
              content: '$a placeholder',
              indicators: ['1', '0'],
            },
            {
              tag: testData.tag651,
              content: '$a placeholder',
              indicators: ['\\', '0'],
            },
          ]).then((instanceId) => {
            createdBibId = instanceId;
          });
        })
          .then(() => {
            // Link bib 240 → authority 1 (110) and bib 651 → authority 2 (151)
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: createdBibId,
              authorityIds: [auth1Id, auth2Id],
              bibFieldTags: [testData.tag240, testData.tag651],
              authorityFieldTags: [testData.tag110, testData.tag151],
              finalBibFieldContents: [bib240FinalContent, bib651FinalContent],
            });
            MarcAuthorities.waitAuthorityLinked(auth1Id, 1);
            MarcAuthorities.waitAuthorityLinked(auth2Id, 1);
          })
          .then(() => {
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            ]).then((userProperties) => {
              userData = userProperties;
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(auth1Id, true);
        MarcAuthority.deleteViaAPI(auth2Id, true);
        InventoryInstance.deleteInstanceViaApi(createdBibId);
        Users.deleteViaApi(userData.userId);
      });

      it(
        "C605927 Check order of controlled subfields in MARC bib's field after update of linked 'MARC authority' record via 'quickMARC' (spitfire)",
        { tags: ['extendedPath', 'spitfire', 'C605927'] },
        () => {
          // Step 1: Login and navigate to MARC Authorities app, open authority 2 detail view
          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });

          MarcAuthorities.searchBy('Identifier (all)', testData.auth2NaturalId);
          MarcAuthorities.selectAuthorityById(auth2Id);
          MarcAuthority.waitLoading();

          // Steps 2-3: Edit authority 2, update 151 field
          // Step 2: Add $y Independence war to 151
          // Step 3: Update $a United States → $a United States of America
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag151, testData.auth2Tag151AfterFirstEdit);
          QuickMarcEditor.checkContentByTag(testData.tag151, testData.auth2Tag151AfterFirstEdit);

          // Step 4: Save & close (confirm update linked bib fields modal)
          QuickMarcEditor.pressSaveAndClose({ acceptLinkedBibModal: true });
          MarcAuthority.waitLoading();

          // Step 5: Search for authority 1 and open detail view
          MarcAuthorities.searchBy('Identifier (all)', testData.auth1NaturalId);
          MarcAuthorities.selectAuthorityById(auth1Id);
          MarcAuthority.waitLoading();

          // Steps 6-8: Edit authority 1, update 110 field
          // Step 7: Add $d 220 to 110 field
          // Step 8: Delete $d 1978 September 17 (Framework for Peace in the Middle East)
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag110, testData.auth1Tag110UpdatedContent);
          QuickMarcEditor.checkContentByTag(testData.tag110, testData.auth1Tag110UpdatedContent);

          // Step 9: Save & close (confirm update linked bib fields modal)
          QuickMarcEditor.pressSaveAndClose({ acceptLinkedBibModal: true });
          MarcAuthority.waitLoading();

          // Step 10: Search for authority 2 again and open detail view
          MarcAuthorities.searchBy('Identifier (all)', testData.auth2NaturalId);
          MarcAuthorities.selectAuthorityById(auth2Id);
          MarcAuthority.waitLoading();

          // Steps 11-12: Edit authority 2 again
          // Step 11: Update $x History → $x Hist in 151 field
          // Step 12: Update 010 $a to new value
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag151, testData.auth2Tag151AfterSecondEdit);
          QuickMarcEditor.checkContentByTag(testData.tag151, testData.auth2Tag151AfterSecondEdit);
          QuickMarcEditor.updateExistingField(
            testData.tag010,
            `$a ${testData.auth2NaturalIdUpdated}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tag010,
            `$a ${testData.auth2NaturalIdUpdated}`,
          );

          // Step 13: Save & close (confirm update linked bib fields modal)
          QuickMarcEditor.pressSaveAndClose({ acceptLinkedBibModal: true });
          MarcAuthority.waitLoading();

          // Step 14: Navigate to Inventory and find linked instance
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(createdBibId);
          InventoryInstances.selectInstanceById(createdBibId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 15: Open Edit MARC bib record
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Step 16: Check linked 240 field controlled and uncontrolled subfields
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
            linkedField240Data.tag,
            linkedField240Data.ind1,
            linkedField240Data.ind2,
            linkedField240Data.controlledContent,
            linkedField240Data.uncontrolledAlpha,
            `$0 ${testData.auth1NaturalIdUrl}${testData.auth1NaturalId}`,
            linkedField240Data.uncontrolledDigit,
          );

          // Step 17: Check linked 651 field controlled and uncontrolled subfields
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
            linkedField651Data.tag,
            linkedField651Data.ind1,
            linkedField651Data.ind2,
            linkedField651Data.controlledContent,
            linkedField651Data.uncontrolledAlpha,
            `$0 ${testData.auth2NaturalIdUrl}${testData.auth2NaturalIdUpdated}`,
            linkedField651Data.uncontrolledDigit,
          );

          // Step 18: Close Edit MARC record pane
          QuickMarcEditor.closeEditorPane();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 19: Actions → View source, verify subfield order in 240 and 651 fields
          InventoryInstance.viewSource();

          // Verify 240 field subfield order:
          // controlled → uncontrolledAlpha ($e, $v) → $0 → $9[uuid] → uncontrolledDigit ($8, $6)
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.tag240,
            `${field240SourceOrder} $9 ${auth1Id} ${testData.bib240UncontrolledDigit}`,
          );

          // Verify 651 field subfield order:
          // controlled → uncontrolledAlpha ($e, $b) → $0 → $9[uuid] → uncontrolledDigit ($8, $1)
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.tag651,
            `${field651SourceOrder} $9 ${auth2Id} ${testData.bib651UncontrolledDigit}`,
          );
        },
      );
    });
  });
});
