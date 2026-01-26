import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../../support/constants';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../../support/fragments/inventory/search/browseSubjects';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          instanceTitle: 'C405560 Instance Local M1',
          authoritySearchOption: 'Keyword',
          instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        };

        const linkingTagAndValues = {
          authorityHeading: 'C405560 Lentz Local M1',
          rowIndex: 16,
          tag: '100',
          secondBox: '1',
          thirdBox: '\\',
          content: '$a C405560 Lentz Local M1',
          eSubfield: '',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n2011049161405560',
          seventhBox: '',
        };

        const users = {};

        const marcFiles = [
          {
            marc: 'marcBibFileForC405560.mrc',
            fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
            propertyName: 'instance',
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          },
          {
            marc: 'marcAuthFileForC405560.mrc',
            fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
            propertyName: 'authority',
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          },
        ];

        const createdRecordIDs = [];

        before('Create users, data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405560');
          InventoryInstances.deleteInstanceByTitleViaApi('C405560');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ])
            .then((userProperties) => {
              users.userProperties = userProperties;
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
              cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]);
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405560');
              InventoryInstances.deleteInstanceByTitleViaApi('C405560');
              cy.wait(10_000);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              ]);
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405560');
              InventoryInstances.deleteInstanceByTitleViaApi('C405560');
              marcFiles.forEach((marcFile) => {
                DataImport.uploadFileViaApi(
                  marcFile.marc,
                  marcFile.fileNameImported,
                  marcFile.jobProfileToRun,
                ).then((response) => {
                  response.forEach((record) => {
                    createdRecordIDs.push(record[marcFile.propertyName].id);
                  });
                });
              });
              cy.resetTenant();
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              InventoryInstances.waitContentLoading();
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          cy.resetTenant();
          cy.setTenant(Affiliations.University);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        });

        it(
          'C405560 Link Local MARC bib with Local MARC Authority in Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C405560'] },
          () => {
            InventorySearchAndFilter.searchByParameter(
              testData.instanceSearchOption,
              createdRecordIDs[0],
            );
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(linkingTagAndValues.authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              linkingTagAndValues.tag,
              linkingTagAndValues.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValues.rowIndex,
              linkingTagAndValues.tag,
              linkingTagAndValues.secondBox,
              linkingTagAndValues.thirdBox,
              linkingTagAndValues.content,
              linkingTagAndValues.eSubfield,
              linkingTagAndValues.zeroSubfield,
              linkingTagAndValues.seventhBox,
            );
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.openLinkingAuthorityByIndex(16);
            MarcAuthorities.checkFieldAndContentExistence(
              linkingTagAndValues.tag,
              linkingTagAndValues.authorityHeading,
            );
            cy.go('back');
            QuickMarcEditor.closeEditorPane();

            InventoryInstance.verifyRecordAndMarcAuthIcon(
              'Contributor',
              `Linked to MARC authority\n${linkingTagAndValues.authorityHeading}`,
            );

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseContributors.select();
            cy.setTenant(Affiliations.University);
            BrowseContributors.waitForContributorToAppear(
              linkingTagAndValues.authorityHeading,
              true,
              true,
            );
            BrowseContributors.browse(linkingTagAndValues.authorityHeading);
            BrowseSubjects.checkRowWithValueAndAuthorityIconExists(
              linkingTagAndValues.authorityHeading,
            );
            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.searchBy(
              testData.authoritySearchOption,
              linkingTagAndValues.authorityHeading,
            );
            MarcAuthorities.selectTitle(linkingTagAndValues.authorityHeading);
            MarcAuthorities.checkRecordDetailPageMarkedValue(linkingTagAndValues.authorityHeading);

            cy.visit(TopMenu.inventoryPath);
            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.searchBy(
              testData.authoritySearchOption,
              linkingTagAndValues.authorityHeading,
            );
            MarcAuthorities.checkNoResultsMessage(
              `No results found for "${linkingTagAndValues.authorityHeading}". Please check your spelling and filters.`,
            );
            cy.visit(TopMenu.inventoryPath);
            InventorySearchAndFilter.searchByParameter(
              testData.instanceSearchOption,
              testData.instanceTitle,
            );
            InventoryInstance.verifyNoResultFoundMessage(
              `No results found for "${testData.instanceTitle}". Please check your spelling and filters.`,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.searchBy(
              testData.authoritySearchOption,
              linkingTagAndValues.authorityHeading,
            );
            MarcAuthorities.checkNoResultsMessage(
              `No results found for "${linkingTagAndValues.authorityHeading}". Please check your spelling and filters.`,
            );
            cy.visit(TopMenu.inventoryPath);
            InventorySearchAndFilter.searchByParameter(
              testData.instanceSearchOption,
              testData.instanceTitle,
            );
            InventoryInstance.verifyNoResultFoundMessage(
              `No results found for "${testData.instanceTitle}". Please check your spelling and filters.`,
            );
          },
        );
      });
    });
  });
});
