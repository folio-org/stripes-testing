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
            authority100FieldValue: `AT_C405926_MarcAuthority_${randomPostfix}`,
            instanceTitle: `AT_C405926_MarcBibInstance_${randomPostfix}`,
            expectedCalloutMessage: 'Field 100 has been linked to MARC authority record(s).',
            naturalId: `${getRandomLetters(15)}405926${randomNDigitNumber(4)}`,
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

          const autolinkableFields = [100];

          let user;
          const createdRecordIDs = [];

          before('Create users, data', () => {
            cy.getAdminToken();

            // Delete any existing test data
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405926_');
            InventoryInstances.deleteInstanceByTitleViaApi('C405926_');

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
                // Create local MARC authority in Member 1 (College) tenant
                cy.setTenant(Affiliations.College);

                MarcAuthorities.createMarcAuthorityViaAPI(
                  testData.naturalId,
                  '',
                  marcAuthority100Fields,
                ).then((authorityId) => {
                  createdRecordIDs.push(authorityId);
                });

                // Create local MARC bib in Member 1 (College) tenant
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
                  authRefresh: true,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              });
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();

            // Delete user and local records from College tenant where they were created
            cy.setTenant(Affiliations.College);
            Users.deleteViaApi(user.userId);
            MarcAuthority.deleteViaAPI(createdRecordIDs[0], true);
            InventoryInstance.deleteInstanceViaApi(createdRecordIDs[1]);
          });

          it(
            'C405926 Automated linking of Local MARC bib to Local MARC Authority in Member tenant (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C405926'] },
            () => {
              // Step 1: Edit local MARC bib in Member 1
              InventoryInstances.searchByTitle(createdRecordIDs[1]);
              InventoryInstances.selectInstanceById(createdRecordIDs[1]);
              InventoryInstance.waitLoading();
              InventoryInstance.waitInstanceRecordViewOpened();
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

              // Step 4: Press Cancel to close editing pane
              QuickMarcEditor.pressCancel();
              InventoryInstance.waitLoading();
              InventoryInstance.waitInstanceRecordViewOpened();

              // Step 5: Verify contributor display with MARC authority icon
              InventoryInstance.checkContributor(
                `${testData.linkedIconText}${testData.authority100FieldValue}`,
              );

              // Steps 6-9: Switch to Central tenant and verify no records found
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              InventoryInstances.waitContentLoading();
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();
              MarcAuthorities.searchBeats(testData.authority100FieldValue);
              MarcAuthorities.verifyEmptySearchResults(testData.authority100FieldValue);

              // Steps 10-11: Verify no instance records in Central
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.waitContentLoading();
              InventoryInstances.searchByTitle(createdRecordIDs[1], false);
              InventorySearchAndFilter.verifyNoRecordsFound();

              // Steps 12-15: Switch to Member 2 (University) and verify no records found
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();
              MarcAuthorities.searchBeats(testData.authority100FieldValue);
              MarcAuthorities.verifyEmptySearchResults(testData.authority100FieldValue);

              // Steps 16-17: Verify no instance records in Member 2
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.waitContentLoading();
              InventoryInstances.searchByTitle(createdRecordIDs[1], false);
              InventorySearchAndFilter.verifyNoRecordsFound();
            },
          );
        });
      });
    });
  });
});
