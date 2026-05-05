import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(10);
        const randomDigits = randomNDigitNumber(10);
        const instanceTitle = `AT_C440066_MarcBibInstance_${randomPostfix}`;
        const field100Index = 5;
        const autoinkableTags = [
          '100',
          '110',
          '111',
          '130',
          '240',
          '600',
          '610',
          '611',
          '630',
          '650',
          '651',
          '655',
          '700',
          '710',
          '711',
          '730',
          '800',
          '810',
          '811',
          '830',
        ];

        // Test data covering all prefix position cases and 010 field scenarios
        // Non-repeatable: 100 (main entry), 240 (uniform title) - only ONE each
        // Repeatable: 6xx (subjects), 7xx (added entries), 8xx (series)
        const testData = [
          // Main entry - 100 (non-repeatable, only one)
          {
            bibTag: '100',
            authTag: '100',
            naturalId: `aat${randomLetters}${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 100 ${randomPostfix}`,
          },
          // 240 links to 100 with $t (non-repeatable, only one)
          {
            bibTag: '240',
            authTag: '100',
            naturalId: `ns${randomLetters}${randomDigits}`,
            has010: true,
            field010: `ns${randomLetters}999${randomDigits}`,
            heading: `C440066 Heading 240 ${randomPostfix}`,
            authHas$t: true,
          },
          // 6xx fields (subjects - REPEATABLE)
          // Prefix START
          {
            bibTag: '600',
            authTag: '100',
            naturalId: `fst${randomLetters}${randomDigits}`,
            has010: true,
            field010: '12345',
            heading: `C440066 Heading 600-1 ${randomPostfix}`,
          },
          {
            bibTag: '600',
            authTag: '100',
            naturalId: `sj${randomLetters}${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 600-2 ${randomPostfix}`,
          },
          // Prefix MIDDLE
          {
            bibTag: '610',
            authTag: '110',
            naturalId: `abc${randomLetters}sh${randomDigits}`,
            has010: true,
            field010: `abc${randomLetters}sh999`,
            heading: `C440066 Heading 610-1 ${randomPostfix}`,
          },
          {
            bibTag: '610',
            authTag: '110',
            naturalId: `xyz${randomLetters}n${randomLetters}${randomDigits}`,
            has010: true,
            field010: `xyz${randomLetters}n${randomLetters}${randomDigits}`,
            heading: `C440066 Heading 610-2 ${randomPostfix}`,
          },
          // Prefix END
          {
            bibTag: '611',
            authTag: '111',
            naturalId: `${randomLetters}tgm${randomDigits}`,
            has010: true,
            field010: '12345',
            heading: `C440066 Heading 611-1 ${randomPostfix}`,
          },
          {
            bibTag: '611',
            authTag: '111',
            naturalId: `${randomLetters}aatg${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 611-2 ${randomPostfix}`,
          },
          // Prefix MIDDLE
          {
            bibTag: '630',
            authTag: '130',
            naturalId: `pre${randomLetters}gf${randomDigits}`,
            has010: true,
            field010: `invalid${randomLetters}prefix${randomDigits}1`,
            heading: `C440066 Heading 630-1 ${randomPostfix}`,
          },
          {
            bibTag: '630',
            authTag: '130',
            naturalId: `test${randomLetters}nb${randomLetters}${randomDigits}`,
            has010: true,
            field010: `test${randomLetters}nb${randomLetters}${randomDigits}`,
            heading: `C440066 Heading 630-2 ${randomPostfix}`,
          },
          // Prefix START
          {
            bibTag: '650',
            authTag: '150',
            naturalId: `nr${randomLetters}${randomDigits}`,
            has010: true,
            field010: `different${randomLetters}prefix${randomDigits}1`,
            heading: `C440066 Heading 650-1 ${randomPostfix}`,
          },
          {
            bibTag: '650',
            authTag: '150',
            naturalId: `no${randomLetters}${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 650-2 ${randomPostfix}`,
          },
          // Prefix END
          {
            bibTag: '651',
            authTag: '151',
            naturalId: `${randomLetters}gsafd${randomDigits}`,
            has010: true,
            field010: '12345',
            heading: `C440066 Heading 651-1 ${randomPostfix}`,
          },
          {
            bibTag: '651',
            authTag: '151',
            naturalId: `${randomLetters}rbmscv${randomDigits}`,
            has010: true,
            field010: `${randomLetters}rbmscv${randomDigits}`,
            heading: `C440066 Heading 651-2 ${randomPostfix}`,
          },
          // Prefix MIDDLE
          {
            bibTag: '655',
            authTag: '155',
            naturalId: `mid${randomLetters}dg${randomDigits}`,
            has010: true,
            field010: `other${randomLetters}value${randomDigits}1`,
            heading: `C440066 Heading 655-1 ${randomPostfix}`,
          },
          {
            bibTag: '655',
            authTag: '155',
            naturalId: `pre${randomLetters}mp${randomLetters}${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 655-2 ${randomPostfix}`,
          },
          // 7xx fields (added entries - REPEATABLE)
          // Prefix END
          {
            bibTag: '700',
            authTag: '100',
            naturalId: `${randomLetters}aat${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 700-1 ${randomPostfix}`,
          },
          {
            bibTag: '700',
            authTag: '100',
            naturalId: `${randomLetters}fst${randomDigits}`,
            has010: true,
            field010: `different${randomLetters}${randomDigits}1`,
            heading: `C440066 Heading 700-2 ${randomPostfix}`,
          },
          // Prefix START
          {
            bibTag: '710',
            authTag: '110',
            naturalId: `aatg${randomLetters}${randomDigits}`,
            has010: true,
            field010: `aatg${randomLetters}${randomDigits}`,
            heading: `C440066 Heading 710-1 ${randomPostfix}`,
          },
          {
            bibTag: '710',
            authTag: '110',
            naturalId: `aatfg${randomLetters}${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 710-2 ${randomPostfix}`,
          },
          // Prefix MIDDLE
          {
            bibTag: '711',
            authTag: '111',
            naturalId: `mid${randomLetters}lcgtm${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 711-1 ${randomPostfix}`,
          },
          {
            bibTag: '711',
            authTag: '111',
            naturalId: `test${randomLetters}D${randomLetters}${randomDigits}`,
            has010: true,
            field010: `wrong${randomLetters}value${randomDigits}1`,
            heading: `C440066 Heading 711-2 ${randomPostfix}`,
          },
          // Prefix END
          {
            bibTag: '730',
            authTag: '130',
            naturalId: `${randomLetters}tgm${randomDigits}`,
            has010: true,
            field010: 'otherprefix12345',
            heading: `C440066 Heading 730-1 ${randomPostfix}`,
          },
          {
            bibTag: '730',
            authTag: '130',
            naturalId: `${randomLetters}sj${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 730-2 ${randomPostfix}`,
          },
          // 8xx fields (series added entries - REPEATABLE)
          // Prefix START
          {
            bibTag: '800',
            authTag: '100',
            naturalId: `n${randomLetters}${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 800-1 ${randomPostfix}`,
          },
          {
            bibTag: '800',
            authTag: '100',
            naturalId: `nb${randomLetters}${randomDigits}`,
            has010: true,
            field010: `nb${randomLetters}999${randomDigits}`,
            heading: `C440066 Heading 800-2 ${randomPostfix}`,
          },
          // Prefix MIDDLE
          {
            bibTag: '810',
            authTag: '110',
            naturalId: `test${randomLetters}no${randomLetters}${randomDigits}`,
            has010: true,
            field010: `test${randomLetters}no${randomLetters}${randomDigits}`,
            heading: `C440066 Heading 810-1 ${randomPostfix}`,
          },
          {
            bibTag: '810',
            authTag: '110',
            naturalId: `pre${randomLetters}ns${randomLetters}${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 810-2 ${randomPostfix}`,
          },
          // Prefix END
          {
            bibTag: '811',
            authTag: '111',
            naturalId: `${randomLetters}gf${randomDigits}`,
            has010: true,
            field010: `${randomLetters}gf999`,
            heading: `C440066 Heading 811-1 ${randomPostfix}`,
          },
          {
            bibTag: '811',
            authTag: '111',
            naturalId: `${randomLetters}gsafd${randomDigits}`,
            has010: false,
            heading: `C440066 Heading 811-2 ${randomPostfix}`,
          },
          // Prefix START
          {
            bibTag: '830',
            authTag: '130',
            naturalId: `dg${randomLetters}${randomDigits}`,
            has010: true,
            field010: `dg${randomLetters}${randomDigits}`,
            heading: `C440066 Heading 830-1 ${randomPostfix}`,
          },
          {
            bibTag: '830',
            authTag: '130',
            naturalId: `mp${randomLetters}${randomDigits}`,
            has010: true,
            field010: 'plaintext12345',
            heading: `C440066 Heading 830-2 ${randomPostfix}`,
          },
        ];

        const marcBibFields = [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${instanceTitle}`,
            indicators: ['1', '1'],
          },
        ];

        // Add all bib fields with $0 pointing to naturalId from 001
        testData.forEach((data) => {
          const bibContent =
            data.bibTag === '240'
              ? `$a Title $0 ${data.naturalId}`
              : `$a ${data.heading} $0 ${data.naturalId}`;
          marcBibFields.push({
            tag: data.bibTag,
            content: bibContent,
            indicators: ['1', '\\'],
          });
        });

        // Generate expected callout message with all unique bib tags
        const uniqueBibTags = [...new Set(testData.map((data) => data.bibTag))].sort(
          (a, b) => parseInt(a, 10) - parseInt(b, 10),
        );
        const linkedFieldsList =
          uniqueBibTags.length > 1
            ? `${uniqueBibTags.slice(0, -1).join(', ')}, and ${uniqueBibTags[uniqueBibTags.length - 1]}`
            : uniqueBibTags[0];
        const expectedCalloutMessage = `Field ${linkedFieldsList} has been linked to MARC authority record(s).`;

        let user;
        const createdAuthorityIds = [];
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C440066_');
          InventoryInstances.deleteInstanceByTitleViaApi('C440066_');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            user = createdUserProperties;

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );

              // Create authorities with 001 as naturalId and various 010 scenarios
              testData.forEach((data) => {
                const authorityFields = [];

                // Add 010 field based on test scenario
                if (data.has010) {
                  authorityFields.push({
                    tag: '010',
                    content: `$a ${data.field010}`,
                    indicators: ['\\', '\\'],
                  });
                }

                // Add heading field with optional $t for 240 linking
                const headingContent = data.authHas$t
                  ? `$a ${data.heading} $t Title`
                  : `$a ${data.heading}`;
                authorityFields.push({
                  tag: data.authTag,
                  content: headingContent,
                  indicators: ['1', '\\'],
                });

                // Pass whole naturalId in first arg, empty string in second - they get concatenated to form 001 content
                MarcAuthorities.createMarcAuthorityViaAPI(data.naturalId, '', authorityFields).then(
                  (createdRecordId) => {
                    createdAuthorityIds.push(createdRecordId);
                  },
                );
              });
              autoinkableTags.forEach((tag) => {
                QuickMarcEditor.setRulesForField(tag, true);
              });
            }).then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          createdAuthorityIds.forEach((authorityId) => {
            MarcAuthority.deleteViaAPI(authorityId, true);
          });
          InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
        });

        it(
          'C440066 "Base URL" doesn\'t show in MARC bib\'s field linked with "MARC authority" record which has prefix, which includes prefix of default "Authority file" (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C440066'] },
          () => {
            // Step 1: Open edit window
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 2: Click "Link headings" button
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(expectedCalloutMessage);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            // Verify all fields are linked
            testData.forEach((data, index) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                index + field100Index,
                data.bibTag,
                '1',
                '\\',
                `$a ${data.bibTag === '240' ? 'Title' : data.heading}`,
                '',
                `$0 ${data.naturalId}`,
                '',
              );
            });

            // Step 3: Save & close
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 4: View source and verify
            InventoryInstance.viewSource();
            testData.forEach((data, index) => {
              InventoryViewSource.verifyLinkedToAuthorityIcon(index + field100Index);
              InventoryViewSource.contains(`$0 ${data.naturalId}`);
            });
            InventoryViewSource.notContains('http://');
            InventoryViewSource.notContains('https://');
          },
        );
      });
    });
  });
});
