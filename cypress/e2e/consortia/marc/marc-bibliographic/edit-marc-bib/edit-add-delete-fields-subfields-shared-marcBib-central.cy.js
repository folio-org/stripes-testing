import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();

        const marcFieldTags = {
          tag008: '008',
          tag100: '100',
          tag245: '245',
          tag600: '600',
          tag650: '650',
          tag700: '700',
          tag710: '710',
        };

        const testData = {
          contributor100Original: `AT_C405521_Contributor100_${randomPostfix}`,
          contributor100Updated: `AT_C405521_Contributor100_Upd_${randomPostfix}`,
          contributor700: `AT_C405521_Contributor700_${randomPostfix}`,
          contributor710New: `AT_C405521_Contributor710_New_${randomPostfix}`,
          subject600Original: `AT_C405521_Subject600_${randomPostfix}`,
          subject600Updated: `AT_C405521_Subject600_Upd_${randomPostfix}`,
          subject650ToDelete: `AT_C405521_Subject650_Delete_${randomPostfix}`,
          instanceTitle: `AT_C405521_MarcBibInstance_${randomPostfix}`,
          originalContributorType: 'Author',
        };

        const marcBibFields = [
          {
            tag: marcFieldTags.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: marcFieldTags.tag100,
            content: `$a ${testData.contributor100Original} $e author.`,
            indicators: ['1', '\\'],
          },
          {
            tag: marcFieldTags.tag245,
            content: `$a ${testData.instanceTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: marcFieldTags.tag600,
            content: `$a ${testData.subject600Original}`,
            indicators: ['1', '0'],
          },
          {
            tag: marcFieldTags.tag650,
            content: `$a ${testData.subject650ToDelete}`,
            indicators: ['\\', '0'],
          },
          {
            tag: marcFieldTags.tag700,
            content: `$a ${testData.contributor700}`,
            indicators: ['1', '\\'],
          },
        ];

        let user;
        const createdRecordIDs = [];

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Delete any existing test data
          InventoryInstances.deleteInstanceByTitleViaApi('C405521_');

          // Create shared MARC bib in Central tenant
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdRecordIDs.push(instanceId);
            },
          );

          // Create user in Central tenant with all required permissions
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ])
            .then((userProperties) => {
              user = userProperties;

              // Assign Member (College) affiliation and permissions
              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]);
            })
            .then(() => {
              // Login to Central tenant
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // Delete user
          Users.deleteViaApi(user.userId);
          // Delete shared instance from Central
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        });

        it(
          'C405521 Adding/deleting fields and subfields when editing shared "MARC Bib" in Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C405521'] },
          () => {
            // Step 1-2: Search for shared instance and edit MARC bib
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstanceById(createdRecordIDs[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.editMarcBibliographicRecord();

            // Step 3: Add new 710 field
            const field100RowIndex = 9;
            QuickMarcEditor.addNewField(
              marcFieldTags.tag710,
              `$a ${testData.contributor710New}`,
              field100RowIndex,
            );
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag710,
              `$a ${testData.contributor710New}`,
            );

            // Step 4: Delete 650 field
            QuickMarcEditor.deleteFieldByTagAndCheck(marcFieldTags.tag650);
            QuickMarcEditor.afterDeleteNotification(marcFieldTags.tag650);

            // Step 5: Add subfield $v to 600 field
            QuickMarcEditor.updateExistingField(
              marcFieldTags.tag600,
              `$a ${testData.subject600Updated} $v Graphical novels, etc`,
            );

            // Step 6: Delete subfield $e from 100 field
            QuickMarcEditor.updateExistingField(
              marcFieldTags.tag100,
              `$a ${testData.contributor100Updated}`,
            );

            // Step 7: Save and keep editing
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.deleteConfirmationPresented();
            QuickMarcEditor.confirmDelete();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();
            QuickMarcEditor.checkNoDeletePlaceholder();

            // Verify updates are applied
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag100,
              `$a ${testData.contributor100Updated}`,
            );
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag600,
              `$a ${testData.subject600Updated} $v Graphical novels, etc`,
            );
            QuickMarcEditor.checkTagAbsent(marcFieldTags.tag650);
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag710,
              `$a ${testData.contributor710New}`,
            );

            // Step 8: Close editor and verify in detail view
            QuickMarcEditor.closeEditorPane();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkContributor(testData.contributor100Updated);
            InventoryInstance.checkContributor(testData.contributor700);
            InventoryInstance.checkContributor(testData.contributor710New);
            InventoryInstance.verifyContributorAbsent(testData.contributor100Original);
            InventoryInstance.verifyContributorAbsent(testData.originalContributorType);

            // Step 9: View source and verify updates
            InventoryInstance.viewSource();
            InventoryViewSource.checkRowExistsWithTagAndValue(
              marcFieldTags.tag100,
              `$a ${testData.contributor100Updated}`,
            );
            InventoryViewSource.checkRowExistsWithTagAndValue(
              marcFieldTags.tag600,
              `$a ${testData.subject600Updated} $v Graphical novels, etc`,
            );
            InventoryViewSource.checkRowExistsWithTagAndValue(
              marcFieldTags.tag650,
              testData.subject650ToDelete,
              false,
            );
            InventoryViewSource.checkRowExistsWithTagAndValue(
              marcFieldTags.tag710,
              `$a ${testData.contributor710New}`,
            );
            InventoryViewSource.close();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 10-11: Browse contributors in Central
            InventorySearchAndFilter.selectBrowseContributors();
            BrowseContributors.waitForContributorToAppear(testData.contributor100Updated);
            BrowseContributors.browse(testData.contributor100Updated);
            BrowseContributors.checkSearchResultRecord(testData.contributor100Updated);

            BrowseContributors.waitForContributorToAppear(testData.contributor710New);
            BrowseContributors.browse(testData.contributor710New);
            BrowseContributors.checkSearchResultRecord(testData.contributor710New);

            // Step 12-13: Switch to Member tenant and verify changes
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstanceById(createdRecordIDs[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Verify contributors in Member tenant
            InventoryInstance.checkContributor(testData.contributor100Updated);
            InventoryInstance.checkContributor(testData.contributor700);
            InventoryInstance.checkContributor(testData.contributor710New);
            InventoryInstance.verifyContributorAbsent(testData.contributor100Original);
            InventoryInstance.verifyContributorAbsent(testData.originalContributorType);

            // Step 14: View source in Member tenant
            InventoryInstance.viewSource();
            InventoryViewSource.checkRowExistsWithTagAndValue(
              marcFieldTags.tag100,
              `$a ${testData.contributor100Updated}`,
            );
            InventoryViewSource.checkRowExistsWithTagAndValue(
              marcFieldTags.tag600,
              `$a ${testData.subject600Updated} $v Graphical novels, etc`,
            );
            InventoryViewSource.checkRowExistsWithTagAndValue(
              marcFieldTags.tag650,
              testData.subject650ToDelete,
              false,
            );
            InventoryViewSource.checkRowExistsWithTagAndValue(
              marcFieldTags.tag710,
              `$a ${testData.contributor710New}`,
            );
            InventoryViewSource.close();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 15: Verify in edit mode in Member tenant
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag100,
              `$a ${testData.contributor100Updated}`,
            );
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag600,
              `$a ${testData.subject600Updated} $v Graphical novels, etc`,
            );
            QuickMarcEditor.checkTagAbsent(marcFieldTags.tag650);
            QuickMarcEditor.checkContentByTag(
              marcFieldTags.tag710,
              `$a ${testData.contributor710New}`,
            );
            QuickMarcEditor.closeEditorPane();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 16-17: Browse subjects in Member tenant
            InventorySearchAndFilter.selectBrowseSubjects();
            cy.setTenant(Affiliations.College);
            BrowseSubjects.waitForSubjectToAppear(
              `${testData.subject600Updated}--Graphical novels, etc`,
            );
            BrowseSubjects.browse(`${testData.subject600Updated}--Graphical novels, etc`);
            BrowseSubjects.checkSearchResultRecord(
              `${testData.subject600Updated}--Graphical novels, etc`,
            );

            BrowseSubjects.browse(testData.subject650ToDelete);
            BrowseSubjects.verifyNonExistentSearchResult(testData.subject650ToDelete);
          },
        );
      });
    });
  });
});
