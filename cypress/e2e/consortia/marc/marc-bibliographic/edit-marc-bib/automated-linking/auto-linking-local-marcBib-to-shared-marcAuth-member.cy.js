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

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();

          const marcFieldTags = {
            tag008: '008',
            tag100: '100',
            tag245: '245',
          };

          const testData = {
            authority100FieldValue: `AT_C405922_MarcAuthority_${randomPostfix}`,
            instanceTitle: `AT_C405922_MarcBibInstance_${randomPostfix}`,
            expectedCalloutMessage: 'Field 100 has been linked to MARC authority record(s).',
            naturalId: `${getRandomLetters(15)}405922${randomNDigitNumber(4)}`,
            editLocalMarcRecord: 'Edit local MARC record',
            linkedIconText: 'Linked to MARC authority',
          };

          const marcAuthority100Fields = [
            {
              tag: marcFieldTags.tag100,
              content: `$a ${testData.authority100FieldValue}`,
              indicators: ['1', '\\'],
            },
          ];

          const marcBibFields = [
            {
              tag: marcFieldTags.tag008,
              content: QuickMarcEditor.valid008ValuesInstance,
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${testData.authority100FieldValue} $0 ${testData.naturalId}`,
              indicators: ['1', '\\'],
            },
            {
              tag: marcFieldTags.tag245,
              content: `$a ${testData.instanceTitle}`,
              indicators: ['1', '1'],
            },
          ];

          const linked100FieldValues = [
            marcFieldTags.tag100,
            ...marcBibFields[1].indicators,
            `$a ${testData.authority100FieldValue}`,
            '',
            `$0 ${testData.naturalId}`,
            '',
          ];

          const autolinkableFields = [
            100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800,
            810, 811, 830,
          ];

          let user;
          const createdRecordIDs = [];

          before('Create users, data', () => {
            cy.getAdminToken();

            // Delete any existing test data
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405922_');
            InventoryInstances.deleteInstanceByTitleViaApi('C405922_');

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
                ]);

                // Assign Member 2 (University) affiliation and permissions
                cy.assignAffiliationToUser(Affiliations.University, user.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.inventoryAll.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                ]);
              })
              .then(() => {
                // Create shared MARC authority in Central tenant
                cy.resetTenant();
                cy.getAdminToken();

                MarcAuthorities.createMarcAuthorityViaAPI(
                  testData.naturalId,
                  '',
                  marcAuthority100Fields,
                ).then((authorityId) => {
                  createdRecordIDs.push(authorityId);
                });

                // Create local MARC bib in Member 1 (College) tenant
                cy.setTenant(Affiliations.College);

                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcBibFields,
                ).then((instanceId) => {
                  createdRecordIDs.push(instanceId);
                });

                // Enable auto-linking rules for all linkable fields
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

            // Delete shared authority from Central
            cy.resetTenant();
            MarcAuthority.deleteViaAPI(createdRecordIDs[0], true);

            // Delete user and local instance from College tenant where they were created
            cy.setTenant(Affiliations.College);
            Users.deleteViaApi(user.userId);
            InventoryInstance.deleteInstanceViaApi(createdRecordIDs[1]);
          });

          it(
            'C405922 Automated linking of Local MARC bib to Shared MARC Authority in Member tenant (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C405922'] },
            () => {
              // Step 1: Edit local MARC bib in Member 1
              InventorySearchAndFilter.clearDefaultHeldbyFilter();
              InventoryInstances.searchByTitle(createdRecordIDs[1]);
              InventoryInstances.selectInstanceById(createdRecordIDs[1]);
              InventoryInstance.checkExpectedMARCSource();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.checkPaneheaderContains(testData.editLocalMarcRecord);
              QuickMarcEditor.verifyEnabledLinkHeadingsButton();

              // Step 2: Click "Link headings" button and verify auto-linking
              QuickMarcEditor.clickLinkHeadingsButton();
              QuickMarcEditor.checkCallout(testData.expectedCalloutMessage);
              QuickMarcEditor.verifyDisabledLinkHeadingsButton();
              // Verify field 100 is linked
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...linked100FieldValues);

              // Step 3: Save and verify link persists
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.waitLoading();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...linked100FieldValues);

              // Step 4: Press Cancel to close editing pane}
              QuickMarcEditor.pressCancel();
              InventoryInstance.waitLoading();
              InventoryInstance.waitInstanceRecordViewOpened();

              // Step 5: Verify contributor display with MARC authority icon
              InventoryInstance.checkContributor(
                `${testData.linkedIconText}${testData.authority100FieldValue}`,
              );

              // Steps 6-9: Switch to Central tenant and verify "Number of titles" is empty
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
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
                '',
              );

              // Steps 10-13: Switch to Member 2 (University) and verify "Number of titles" is empty
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              MarcAuthorities.waitLoading();
              MarcAuthorities.searchBeats(testData.authority100FieldValue);
              MarcAuthorities.verifyResultRowContentSharedIcon(
                testData.authority100FieldValue,
                true,
              );
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(
                testData.authority100FieldValue,
                '',
              );
            },
          );
        });
      });
    });
  });
});
