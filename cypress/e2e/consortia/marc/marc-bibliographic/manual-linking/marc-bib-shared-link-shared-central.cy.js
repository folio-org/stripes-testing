import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Manual linking', () => {
      const testData = {
        sharedPaneheaderText: 'Edit shared MARC record',
        authoritySearchOption: 'Keyword',
        instanceTitle:
          'C397392 Murder in Mérida, 1792 : violence, factions, and the law / Mark W. Lentz.',
        sharedLinkText: 'Shared',
      };

      const linkingTagAndValues = {
        authorityHeading: 'C397392 Lentz, Mark Auto',
        rowIndex: 16,
        tag: '100',
        secondBox: '1',
        thirdBox: '\\',
        content: '$a C397392 Lentz, Mark Auto',
        eSubfield: '$e author.',
        zeroSubfield: '$0 http://id.loc.gov/authorities/names/n9031219397392',
        seventhBox: '',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcBibFileC397392.mrc',
          fileNameImported: `testMarcFileC397392.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        {
          marc: 'marcAuthFileC397392.mrc',
          fileNameImported: `testMarcFileC397392.${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
      ];

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C397392');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            cy.getAdminToken();
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

            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        Users.deleteViaApi(users.userProperties.userId);
      });

      it(
        'C397392 Link Shared MARC bib with Shared MARC auth on Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C397392'] },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.reload();
          }, 30_000);
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkPaneheaderContains(testData.sharedPaneheaderText);
          QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(linkingTagAndValues.authorityHeading);
          InventoryInstance.clickLinkButton();
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
          QuickMarcEditor.deleteField(4);
          QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.instanceTitle);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchByParameter(
            testData.authoritySearchOption,
            linkingTagAndValues.authorityHeading,
          );
          MarcAuthorities.checkRow(
            `${testData.sharedLinkText}${linkingTagAndValues.authorityHeading}`,
          );
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstances.waitLoading();
          InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
          InventoryInstance.checkPresentedText(testData.instanceTitle);
          InventoryInstance.checkContributor(linkingTagAndValues.authorityHeading);
          InventoryInstance.checkMarcAppIconExist(0);

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyKeywordsAsDefault();
          BrowseContributors.select();
          InventorySearchAndFilter.browseSearch(linkingTagAndValues.authorityHeading);
          BrowseContributors.checkAuthorityIconAndValueDisplayed(
            linkingTagAndValues.authorityHeading,
          );
        },
      );
    });
  });
});
