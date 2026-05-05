import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenuNavigation from '../../../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../../../support/constants';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomLetters = getRandomLetters(15);
          const randomDigits = `405922${randomNDigitNumber(4)}`;

          const marcFieldTags = {
            tag008: '008',
            tag100: '100',
            tag130: '130',
            tag150: '150',
            tag151: '151',
            tag245: '245',
            tag650: '650',
            tag651: '651',
            tag830: '830',
          };

          const testData = {
            authority100FieldValue: `AT_C407000_MarcAuthority100_${randomPostfix}`,
            authority6501FieldValue: `AT_C407000_MarcAuthority650_1_${randomPostfix}`,
            authority6502FieldValue: `AT_C407000_MarcAuthority650_2_${randomPostfix}`,
            authority6511FieldValue: `AT_C407000_MarcAuthority651_1_${randomPostfix}`,
            authority6512FieldValue: `AT_C407000_MarcAuthority651_2_${randomPostfix}`,
            authority830FieldValue: `AT_C407000_MarcAuthority830_${randomPostfix}`,
            instanceTitle: `AT_C407000_MarcBibInstance_${randomPostfix}`,
            expectedCalloutMessages: [
              'Field 100, 650, 651, and 830 has been linked to MARC authority record(s).',
              'Field 650 must be set manually by selecting the link icon.',
            ],
            naturalId100: `${randomLetters}407000${randomDigits}1`,
            naturalId6501: `${randomLetters}407000${randomDigits}2`,
            naturalId6502: `${randomLetters}407000${randomDigits}3`,
            naturalId6511: `${randomLetters}407000${randomDigits}4`,
            naturalId6512: `${randomLetters}407000${randomDigits}5`,
            naturalId830: `${randomLetters}407000${randomDigits}6`,
            nonExistingNaturalId: `${randomLetters}407000${randomDigits}7`,
            editSharedMarcRecord: 'Edit shared MARC record',
            linkedIconText: 'Linked to MARC authority',
            bibField100Index: 5,
          };

          const marcAuthority100Fields = [
            {
              tag: marcFieldTags.tag100,
              content: `$a ${testData.authority100FieldValue}`,
              indicators: ['1', '\\'],
            },
          ];

          const marcAuthority6501Fields = [
            {
              tag: marcFieldTags.tag150,
              content: `$a ${testData.authority6501FieldValue}`,
              indicators: ['\\', '0'],
            },
          ];

          const marcAuthority6502Fields = [
            {
              tag: marcFieldTags.tag150,
              content: `$a ${testData.authority6502FieldValue}`,
              indicators: ['\\', '0'],
            },
          ];

          const marcAuthority6511Fields = [
            {
              tag: marcFieldTags.tag151,
              content: `$a ${testData.authority6511FieldValue}`,
              indicators: ['\\', '0'],
            },
          ];

          const marcAuthority6512Fields = [
            {
              tag: marcFieldTags.tag151,
              content: `$a ${testData.authority6512FieldValue}`,
              indicators: ['\\', '0'],
            },
          ];

          const marcAuthority830Fields = [
            {
              tag: marcFieldTags.tag130,
              content: `$a ${testData.authority830FieldValue}`,
              indicators: ['\\', '0'],
            },
          ];

          const marcBibFields = [
            {
              tag: marcFieldTags.tag008,
              content: QuickMarcEditor.valid008ValuesInstance,
            },
            {
              tag: marcFieldTags.tag245,
              content: `$a ${testData.instanceTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${testData.authority100FieldValue} $0 ${testData.naturalId100}`,
              indicators: ['1', '\\'],
            },
            {
              tag: marcFieldTags.tag650,
              content: `$a ${testData.authority6501FieldValue} $0 ${testData.naturalId6501}`,
              indicators: ['\\', '0'],
            },
            {
              tag: marcFieldTags.tag650,
              content: `$a ${testData.authority6502FieldValue} $0 ${testData.nonExistingNaturalId}`,
              indicators: ['\\', '0'],
            },
            {
              tag: marcFieldTags.tag651,
              content: `$a ${testData.authority6511FieldValue} $0 ${testData.naturalId6511}`,
              indicators: ['\\', '0'],
            },
            {
              tag: marcFieldTags.tag651,
              content: `$a ${testData.authority6512FieldValue} $0 ${testData.naturalId6512}`,
              indicators: ['\\', '0'],
            },
            {
              tag: marcFieldTags.tag830,
              content: `$a ${testData.authority830FieldValue} $0 ${testData.naturalId830}`,
              indicators: ['\\', '0'],
            },
          ];

          const linked100FieldValues = [
            testData.bibField100Index,
            marcFieldTags.tag100,
            ...marcBibFields[2].indicators,
            `$a ${testData.authority100FieldValue}`,
            '',
            `$0 ${testData.naturalId100}`,
            '',
          ];

          const linked6501FieldValues = [
            testData.bibField100Index + 1,
            marcFieldTags.tag650,
            ...marcBibFields[3].indicators,
            `$a ${testData.authority6501FieldValue}`,
            '',
            `$0 ${testData.naturalId6501}`,
            '',
          ];

          const unlinked6502FieldValues = [
            testData.bibField100Index + 2,
            marcFieldTags.tag650,
            ...marcBibFields[4].indicators,
            marcBibFields[4].content,
          ];

          const linked6511FieldValues = [
            testData.bibField100Index + 3,
            marcFieldTags.tag651,
            ...marcBibFields[5].indicators,
            `$a ${testData.authority6511FieldValue}`,
            '',
            `$0 ${testData.naturalId6511}`,
            '',
          ];

          const linked6512FieldValues = [
            testData.bibField100Index + 4,
            marcFieldTags.tag651,
            ...marcBibFields[6].indicators,
            `$a ${testData.authority6512FieldValue}`,
            '',
            `$0 ${testData.naturalId6512}`,
            '',
          ];

          const linked830FieldValues = [
            testData.bibField100Index + 5,
            marcFieldTags.tag830,
            ...marcBibFields[7].indicators,
            `$a ${testData.authority830FieldValue}`,
            '',
            `$0 ${testData.naturalId830}`,
            '',
          ];

          const autolinkableFields = [100, 650, 651, 830];

          let user;
          const createdRecordIDs = [];

          before('Create users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();

            // Delete any existing test data
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407000_');
            InventoryInstances.deleteInstanceByTitleViaApi('C407000_');

            // Create shared MARC authorities in Central tenant
            cy.resetTenant();
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.naturalId100,
              '',
              marcAuthority100Fields,
            ).then((authorityId) => {
              createdRecordIDs.push(authorityId);
            });

            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.naturalId6501,
              '',
              marcAuthority6501Fields,
            ).then((authorityId) => {
              createdRecordIDs.push(authorityId);
            });

            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.naturalId6502,
              '',
              marcAuthority6502Fields,
            ).then((authorityId) => {
              createdRecordIDs.push(authorityId);
            });

            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.naturalId6511,
              '',
              marcAuthority6511Fields,
            ).then((authorityId) => {
              createdRecordIDs.push(authorityId);
            });

            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.naturalId6512,
              '',
              marcAuthority6512Fields,
            ).then((authorityId) => {
              createdRecordIDs.push(authorityId);
            });

            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.naturalId830,
              '',
              marcAuthority830Fields,
            ).then((authorityId) => {
              createdRecordIDs.push(authorityId);
            });

            // Create shared MARC bib in Central tenant
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdRecordIDs.push(instanceId);
              },
            );

            // Create user in Member 1 (College) tenant with all required permissions
            cy.setTenant(Affiliations.College);
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            ])
              .then((userProperties) => {
                user = userProperties;

                // Assign Central tenant permissions (Central affiliation is automatic)
                cy.resetTenant();
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.inventoryAll.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                  Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
                ]);

                // Assign Member 2 (University) affiliation and view-only permissions
                cy.assignAffiliationToUser(Affiliations.University, user.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.inventoryAll.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
                ]);
              })
              .then(() => {
                // Enable auto-linking rules for all linkable fields
                cy.resetTenant();
                autolinkableFields.forEach((tag) => {
                  QuickMarcEditor.setRulesForField(tag, true);
                });
              })
              .then(() => {
                // Login to Member 1 (College) tenant - where user was created
                cy.setTenant(Affiliations.College);
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              });
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();

            // Delete user from College tenant where it was created
            cy.setTenant(Affiliations.College);
            Users.deleteViaApi(user.userId);

            // Delete shared records from Central tenant
            cy.resetTenant();
            MarcAuthority.deleteViaAPI(createdRecordIDs[0], true);
            MarcAuthority.deleteViaAPI(createdRecordIDs[1], true);
            MarcAuthority.deleteViaAPI(createdRecordIDs[2], true);
            MarcAuthority.deleteViaAPI(createdRecordIDs[3], true);
            MarcAuthority.deleteViaAPI(createdRecordIDs[4], true);
            MarcAuthority.deleteViaAPI(createdRecordIDs[5], true);
            InventoryInstance.deleteInstanceViaApi(createdRecordIDs[6]);
          });

          it(
            'C407000 Automated linking of Shared MARC bib with Shared MARC auth on Member tenant (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407000'] },
            () => {
              // Step 1-2: Edit shared MARC bib in Member 1 and auto-link
              InventorySearchAndFilter.clearDefaultHeldbyFilter();
              InventoryInstances.searchByTitle(createdRecordIDs[6]);
              InventoryInstances.selectInstanceById(createdRecordIDs[6]);
              InventoryInstance.waitLoading();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.checkPaneheaderContains(testData.editSharedMarcRecord);
              QuickMarcEditor.verifyEnabledLinkHeadingsButton();
              QuickMarcEditor.clickLinkHeadingsButton();
              testData.expectedCalloutMessages.forEach((message) => {
                QuickMarcEditor.checkCallout(message);
              });
              QuickMarcEditor.verifyEnabledLinkHeadingsButton();
              // Verify fields are linked
              QuickMarcEditor.verifyTagFieldAfterLinking(...linked100FieldValues);
              QuickMarcEditor.verifyTagFieldAfterLinking(...linked6501FieldValues);
              QuickMarcEditor.verifyTagFieldAfterUnlinking(...unlinked6502FieldValues);
              QuickMarcEditor.verifyTagFieldAfterLinking(...linked6511FieldValues);
              QuickMarcEditor.verifyTagFieldAfterLinking(...linked6512FieldValues);
              QuickMarcEditor.verifyTagFieldAfterLinking(...linked830FieldValues);

              // Step 3: Save and close
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
              InventoryInstance.waitLoading();
              InventoryInstance.waitInstanceRecordViewOpened();

              // Step 4-5: Verify contributor with authority icon and view source
              InventoryInstance.viewSource();
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked100FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked6501FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(unlinked6502FieldValues[0], false);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked6511FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked6512FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked830FieldValues[0]);

              // Steps 6-10: Switch to Member 2 and verify "Number of titles" = 1
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.college,
                tenantNames.university,
              );
              InventoryInstances.waitContentLoading();
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();
              MarcAuthorities.searchBeats(testData.authority100FieldValue);
              MarcAuthorities.verifyResultRowContentSharedIcon(
                testData.authority100FieldValue,
                true,
              );
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(
                testData.authority100FieldValue,
                1,
              );
              MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(
                testData.authority100FieldValue,
                1,
              );
              InventoryInstance.waitLoading();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.checkInstanceTitle(testData.instanceTitle);

              // Step 11: Verify source shows linked fields in Member 2
              InventoryInstance.viewSource();
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked100FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked6501FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(unlinked6502FieldValues[0], false);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked6511FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked6512FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked830FieldValues[0]);
              InventoryViewSource.close();
              InventoryInstance.waitLoading();

              // Steps 12-16: Switch to Central and verify "Number of titles" = 1
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.university,
                tenantNames.central,
              );
              InventoryInstances.waitContentLoading();
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();
              MarcAuthorities.searchBeats(testData.authority6511FieldValue);
              MarcAuthorities.verifyResultRowContentSharedIcon(
                testData.authority6511FieldValue,
                true,
              );
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(
                testData.authority6511FieldValue,
                1,
              );
              MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(
                testData.authority6511FieldValue,
                '1',
              );
              InventoryInstance.waitLoading();
              InventoryInstance.checkInstanceTitle(testData.instanceTitle);
              InventoryInstance.waitInstanceRecordViewOpened();

              // Step 17: Verify source shows linked fields in Central
              InventoryInstance.viewSource();
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked100FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked6501FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(unlinked6502FieldValues[0], false);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked6511FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked6512FieldValues[0]);
              InventoryViewSource.verifyLinkedToAuthorityIcon(linked830FieldValues[0]);
            },
          );
        });
      });
    });
  });
});
