import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { including } from '../../../../interactors';
import getRandomPostfix from '../../../support/utils/stringTools';

const marcBibFile = 'marcBibFileC375162.mrc';
const marcAuthFile = 'marcAuthFileC375162.mrc';
const bibJobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
const authJobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const authorityHeading = 'C375162 Auth155';
const bibTag = '655';
const authorityTag = '155';
const subjectAccordionName = 'Subject';
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
  describe('Subject Browse', () => {
    before('Create user and import records', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C375162');
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375162');
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
          authRefresh: true,
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
      'C375162 Browse | Authorized indicator is shown for "Subject" from "655" "MARC Bib" field controlled by "MARC authority" record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C375162'] },
      () => {
        // Step 1: Select "Subjects" in browse options dropdown
        BrowseSubjects.select();
        BrowseSubjects.waitForSubjectToAppear(authorityHeading, true, true);

        // Step 2: Input query in browse input field which matches "655" linked field value
        BrowseSubjects.browse(authorityHeading);

        // Step 3: Verify subject entry is bold and has authority icon
        BrowseSubjects.checkValueIsBold(authorityHeading);
        BrowseSubjects.checkRowWithValueAndAuthorityIconExists(authorityHeading);

        // Step 4: Click at "MARC authority" icon next to subject value
        BrowseSubjects.clickOnAuthorityIcon(authorityHeading);
        MarcAuthority.waitLoading();

        // Step 4a: Verify authority record detail view is opened and 155 field is highlighted
        MarcAuthority.verifyHeader(authorityHeading);
        MarcAuthority.contains(`${authorityTag}\t.*${authorityHeading}`, { regexp: true });
        MarcAuthority.verifyValueHighlighted(authorityHeading);

        // Step 5: Return to Inventory tab
        InventoryInstance.goToPreviousPage();
        BrowseSubjects.checkValueIsBold(authorityHeading);
        BrowseSubjects.checkRowWithValueAndAuthorityIconExists(authorityHeading);

        // Switch to Search tab, search for the instance by subject
        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.searchByParameter(subjectAccordionName, authorityHeading);
        InventoryInstances.selectInstanceById(instanceRecordId);
        InventoryInstance.waitLoading();
        InventoryInstance.verifySubjectHeading(including(authorityHeading));
        InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(subjectAccordionName);

        // Unlink record field and verify browse result
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.clickUnlinkIconInFieldByTag(bibTag);
        QuickMarcEditor.confirmUnlinkingField();
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        BrowseSubjects.waitForSubjectToAppear(authorityHeading, true, false);
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.checkValueIsBold(authorityHeading);
        BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(authorityHeading);
      },
    );
  });
});
