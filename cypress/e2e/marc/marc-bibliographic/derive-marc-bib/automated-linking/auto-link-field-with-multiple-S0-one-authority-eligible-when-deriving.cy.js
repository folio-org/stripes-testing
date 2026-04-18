import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const randomDigits = randomNDigitNumber(8);

        // naturalId1: matches 2 auth records (100 auth linkable, 150 auth not linkable to 100)
        const naturalId1 = `${randomLetters}${randomDigits}`;
        // naturalId2 and naturalId3: no matching auth records
        const naturalId2 = `${randomLetters}${randomNDigitNumber(8)}x`;
        const naturalId3 = `${randomLetters}${randomNDigitNumber(8)}y`;

        const testData = {
          tag008: '008',
          tag100: '100',
          tag150: '150',
          tag245: '245',
          bibTitle: `AT_C389496_MarcBibInstance_${randomPostfix}`,
          auth100Heading: `AT_C389496_MarcAuthority100_${randomPostfix}`,
          auth150Heading: `AT_C389496_MarcAuthority150_${randomPostfix}`,
          contributorsSectionId: 'list-contributors',
          successCalloutMessage: 'Field 100 has been linked to MARC authority record(s).',
        };

        // Auth 1: 100 field, 001 = naturalId1 → linkable to bib 100
        const auth100Fields = [
          {
            tag: testData.tag100,
            content: `$a ${testData.auth100Heading}`,
            indicators: ['1', '\\'],
          },
        ];

        // Auth 2: 150 field, 001 = naturalId1 → NOT linkable to bib 100
        const auth150Fields = [
          {
            tag: testData.tag150,
            content: `$a ${testData.auth150Heading}`,
            indicators: ['\\', '\\'],
          },
        ];

        const bibFields = [
          {
            tag: testData.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tag100,
            content: `$a Initial value $0 ${naturalId1} $0 ${naturalId2} $0 ${naturalId3}`,
            indicators: ['1', '\\'],
          },
        ];

        let user;
        let createdInstanceId;
        let auth100Id;
        let auth150Id;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389496');
          InventoryInstances.deleteInstanceByTitleViaApi('C389496');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
              (instanceId) => {
                createdInstanceId = instanceId;
              },
            );

            // Auth with 100 field: 001 = naturalId1 (linkable to bib 100)
            MarcAuthorities.createMarcAuthorityViaAPI(
              randomLetters,
              randomDigits,
              auth100Fields,
            ).then((id) => {
              auth100Id = id;
            });

            // Auth with 150 field: 001 = naturalId1 (NOT linkable to bib 100)
            // Use different LDR prefix so 001 also equals naturalId1
            MarcAuthorities.createMarcAuthorityViaAPI(
              `${randomLetters}z`,
              randomDigits,
              auth150Fields,
            ).then((id) => {
              auth150Id = id;
            });

            QuickMarcEditor.setRulesForField(testData.tag100, true);

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceByTitleViaApi('C389496');
          MarcAuthority.deleteViaAPI(auth100Id, true);
          MarcAuthority.deleteViaAPI(auth150Id, true);
        });

        it(
          'C389496 Auto-linking of field with multiple "$0" and one "MARC authority" eligible for linking ("MARC Authority" records with same "naturalIds" but different heading tags) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C389496'] },
          () => {
            // Step 1: Find and open detail view
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();

            // Step 2: Derive new MARC bib record
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Click "Link headings" - 100 field linked to 100 auth; button stays enabled
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.successCalloutMessage);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.tag100,
              '1',
              '\\',
              `$a ${testData.auth100Heading}`,
              '',
              `$0 ${naturalId1}`,
              '',
            );

            // Step 4: Save & close
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
            InventoryInstance.waitLoading();

            // Step 5: MARC authority icon shown next to auto-linked contributor
            InventoryInstance.checkAuthorityAppIconInSection(
              testData.contributorsSectionId,
              testData.auth100Heading,
              true,
            );

            // Step 6: View source - 100 field has MARC authority icon
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag100, true);
          },
        );
      });
    });
  });
});
