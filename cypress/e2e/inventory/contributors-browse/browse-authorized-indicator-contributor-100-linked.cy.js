import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';

const marcBibFile = 'marcBibFileC375249.mrc';
const marcAuthFile = 'marcAuthFileC375249.mrc';
const bibJobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
const authJobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const authorityHeading = 'C375249 Kerouac, Jack';
const bibTag = '100';
const authorityTag = '100';
const contributorAccordionName = 'Contributor';
const randomPostfix = getRandomPostfix();

let user;
let authorityRecordId;
let instanceRecordId;

const requiredPermissions = [
  Permissions.inventoryAll.gui,
  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
  Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
];

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    before('Create user and import records', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C375249');
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375249');
      cy.createTempUser(requiredPermissions).then((createdUser) => {
        user = createdUser;
      });

      cy.then(() => {
        DataImport.uploadFileViaApi(
          marcAuthFile,
          `${marcAuthFile.split('.')[0]}_${randomPostfix}.mrc`,
          authJobProfile,
        ).then((response) => {
          authorityRecordId = response[0].authority.id;
        });
        DataImport.uploadFileViaApi(
          marcBibFile,
          `${marcBibFile.split('.')[0]}_${randomPostfix}.mrc`,
          bibJobProfile,
        ).then((response) => {
          instanceRecordId = response[0].instance.id;
        });
      }).then(() => {
        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(instanceRecordId);
        InventoryInstances.selectInstanceById(instanceRecordId);
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(bibTag);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(authorityHeading);
        MarcAuthority.contains(authorityHeading);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(bibTag);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
        InventorySearchAndFilter.switchToBrowseTab();
      });
    });

    after('Delete user, records', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      MarcAuthority.deleteViaAPI(authorityRecordId, true);
      InventoryInstance.deleteInstanceViaApi(instanceRecordId);
    });

    it(
      'C375249 Browse | Authorized indicator is shown for "Contributor" from "100" "MARC Bib" field controlled by "MARC authority" record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C375249'] },
      () => {
        // Step 1: Select "Contributors" in browse options dropdown
        BrowseContributors.select();
        BrowseContributors.waitForContributorToAppear(authorityHeading, true, true);

        // Step 2: Input query in browse input field which matches "100" linked field value
        BrowseContributors.browse(authorityHeading);

        // Step 3: Verify contributor entry is bold and has authority icon
        BrowseSubjects.checkValueIsBold(authorityHeading);
        BrowseSubjects.checkRowWithValueAndAuthorityIconExists(authorityHeading);

        // Step 4: Click at "MARC authority" icon next to contributor value
        BrowseSubjects.clickOnAuthorityIcon(authorityHeading);
        MarcAuthority.waitLoading();

        // Step 4a: Verify authority record detail view is opened and 100 field is highlighted
        MarcAuthority.verifyHeader(authorityHeading);
        MarcAuthority.contains(`${authorityTag}\t.*${authorityHeading}`, { regexp: true });
        MarcAuthority.verifyValueHighlighted(authorityHeading);

        // Step 5: Return to Inventory tab
        InventoryInstance.goToPreviousPage();
        BrowseSubjects.checkValueIsBold(authorityHeading);
        BrowseSubjects.checkRowWithValueAndAuthorityIconExists(authorityHeading);

        // Step 6: Click on the highlighted in bold contributor name
        BrowseSubjects.selectInstanceWithAuthorityIcon(authorityHeading);
        InventoryInstance.waitLoading();
        InventoryInstance.verifyContributorWithMarcAppLink(0, 1, authorityHeading);
        InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
          contributorAccordionName,
        );

        // Step 7: Edit MARC bibliographic record
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.clickUnlinkIconInFieldByTag(bibTag);
        QuickMarcEditor.confirmUnlinkingField();
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        BrowseContributors.waitForContributorToAppear(authorityHeading, true, false);

        // Step 10: Switch to Browse tab and verify unlinked value
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.checkValueIsBold(authorityHeading);
        BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(authorityHeading);
      },
    );
  });
});
