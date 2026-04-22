import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);

        const testData = {
          tags: {
            tag008: '008',
            tag245: '245',
            tag100: '100',
            tag240: '240',
            tag650: '650',
            tag655: '655',
            tag800: '800',
            tag830: '830',
          },
          bibTitle: `C389479 Sleeping in the ground ${randomPostfix}`,
          derivedBibTitle: `C389479 Sleeping in the ground derived ${randomPostfix}`,
          contributor100: `C389479 Jackson, Peter ${randomPostfix}`,
          title240: `C389479 Hosanna ${randomPostfix}`,
          subject650: `C389479 Murder Investigation ${randomPostfix}`,
          subject655: `C389479 Detective fiction ${randomPostfix}`,
          authorityHeading800: `C389479 Inspector Banks series ${randomPostfix}`,
          authorityHeading830: `C389479 Brighton tracts ${randomPostfix}`,
          // Natural IDs for matching
          naturalId100: `n100${randomLetters}`,
          naturalId240: `n240${randomLetters}`,
          naturalId650NoMatch: `n650nomatch${randomLetters}`,
          naturalId655NoMatch: `n655nomatch${randomLetters}`,
          naturalId800: `n800${randomLetters}`,
          naturalId830: `n830${randomLetters}`,
          // Expected callouts
          successCallout: 'Field 100 and 240 has been linked to MARC authority record(s).',
          errorNoMatchCallout: 'Field 650 and 655 must be set manually by selecting the link icon.',
          errorMultipleMatchCallout:
            'Field 800 and 830 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field.',
        };

        const authData = { prefix: randomLetters };

        const marcBibFields = [
          {
            tag: testData.tags.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tags.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '0'],
          },
          {
            tag: testData.tags.tag100,
            content: `$a ${testData.contributor100} $0 ${testData.naturalId100}`,
            indicators: ['1', '\\'],
          },
          {
            tag: testData.tags.tag240,
            content: `$a ${testData.title240} $0 ${testData.naturalId240}`,
            indicators: ['\\', '0'],
          },
          {
            tag: testData.tags.tag650,
            content: `$a ${testData.subject650} $0 ${testData.naturalId650NoMatch}`,
            indicators: ['\\', '0'],
          },
          {
            tag: testData.tags.tag655,
            content: `$a ${testData.subject655} $0 ${testData.naturalId655NoMatch}`,
            indicators: ['\\', '7'],
          },
          {
            tag: testData.tags.tag800,
            content: `$a ${testData.authorityHeading800} $0 ${testData.naturalId800}`,
            indicators: ['1', '\\'],
          },
          {
            tag: testData.tags.tag830,
            content: `$a ${testData.authorityHeading830} $0 ${testData.naturalId830}`,
            indicators: ['\\', '0'],
          },
        ];

        // Authority for field 100 (single match)
        const authorityFields100 = [
          {
            tag: '010',
            content: `$a ${testData.naturalId100}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '100',
            content: `$a ${testData.contributor100}`,
            indicators: ['1', '\\'],
          },
        ];

        // Authority for field 240 (single match) - 100 can link to 240
        const authorityFields240 = [
          {
            tag: '010',
            content: `$a ${testData.naturalId240}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '100',
            content: `$a ${testData.title240} $t Work title`,
            indicators: ['1', '\\'],
          },
        ];

        // Authority 1 for field 800 (multiple match) - 100 can link to 800
        const authorityFields800First = [
          {
            tag: '010',
            content: `$a ${testData.naturalId800}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '100',
            content: `$a ${testData.authorityHeading800} $c Variant 1`,
            indicators: ['1', '\\'],
          },
        ];

        // Authority 2 for field 800 (multiple match - same naturalId)
        const authorityFields800Second = [
          {
            tag: '010',
            content: `$a ${testData.naturalId800}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '100',
            content: `$a ${testData.authorityHeading800} $c Variant 2`,
            indicators: ['1', '\\'],
          },
        ];

        // Authority 1 for field 830 (multiple match) - 130 can link to 830
        const authorityFields830First = [
          {
            tag: '010',
            content: `$a ${testData.naturalId830}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '130',
            content: `$a ${testData.authorityHeading830} $v no. 1`,
            indicators: ['\\', '0'],
          },
        ];

        // Authority 2 for field 830 (multiple match - same naturalId)
        const authorityFields830Second = [
          {
            tag: '010',
            content: `$a ${testData.naturalId830}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '130',
            content: `$a ${testData.authorityHeading830} $v no. 2`,
            indicators: ['\\', '0'],
          },
        ];

        const linkableFields = [100, 240, 650, 655, 800, 830];
        let userData = {};
        let createdInstanceId;
        let derivedInstanceId;
        const createdAuthorityIds = [];

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389479');
          InventoryInstances.deleteInstanceByTitleViaApi('C389479');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

            cy.then(() => {
              // Create bib record
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );

              // Create authority for field 100 (single match)
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                '100',
                authorityFields100,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });

              // Create authority for field 240 (single match)
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                '240',
                authorityFields240,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });

              // Create 2 authorities for field 800 (multiple match)
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                '800First',
                authorityFields800First,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });

              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                '800Second',
                authorityFields800Second,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });

              // Create 2 authorities for field 830 (multiple match)
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                '830First',
                authorityFields830First,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });

              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                '830Second',
                authorityFields830Second,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });
            }).then(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          if (createdInstanceId) {
            InventoryInstances.deleteInstanceByTitleViaApi(testData.bibTitle);
          }
          if (derivedInstanceId) {
            InventoryInstance.deleteInstanceViaApi(derivedInstanceId);
          }
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, false);
          });
        });

        it(
          'C389479 All three messages shown for multiple fields each when auto-linking fields when deriving "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C389479'] },
          () => {
            // Step 1: Find and open detail view of record from precondition
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();

            // Step 2: Click on "Actions" → Select "Derive new MARC bibliographic record"
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Click on the "Link headings" button
            QuickMarcEditor.clickLinkHeadingsButton();

            // Verify all three callout messages
            QuickMarcEditor.checkCallout(testData.successCallout);
            QuickMarcEditor.checkCallout(testData.errorNoMatchCallout);
            QuickMarcEditor.checkCallout(testData.errorMultipleMatchCallout);

            // Verify "Link headings" button is still enabled
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Update field 245 to make title unique for derived record
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.derivedBibTitle}`,
            );

            // Step 4: Click "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkCallout('Creating record may take several seconds.');
            QuickMarcEditor.checkCallout('Record created.');
            InventoryInstance.waitLoading();

            // Capture derived instance ID
            InventoryInstance.getId().then((id) => {
              derivedInstanceId = id;
            });

            // Step 5: Click on the "Browse" toggle → Select "Contributors" → Search by linked 100 field value
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseContributors.select();
            BrowseContributors.waitForContributorToAppear(testData.contributor100, true, true);
            BrowseContributors.browse(testData.contributor100);
            BrowseSubjects.checkRowWithValueAndAuthorityIconExists(testData.contributor100);

            // Step 6: Click on highlighted contributor name → verify redirect to derived Instance
            BrowseSubjects.selectInstanceWithAuthorityIcon(testData.contributor100);
            InventoryInstances.selectInstanceByTitle(testData.derivedBibTitle);

            // Step 7: Click on "Actions" → Select "View source" option
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();

            // Verify only fields 100 and 240 have MARC authority app icon
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tags.tag100);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tags.tag240);

            // Verify fields 650, 655, 800, 830 do NOT have authority icon
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tags.tag650, false);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tags.tag655, false);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tags.tag800, false);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tags.tag830, false);
          },
        );
      });
    });
  });
});
