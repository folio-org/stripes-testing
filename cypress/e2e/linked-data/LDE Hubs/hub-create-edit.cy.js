import TopMenu from '../../../support/fragments/topMenu';
import NewHub from '../../../support/fragments/linked-data/newHubPage';
import LinkedDataEditor from '../../../support/fragments/linked-data/linkedDataEditor';
import { DEFAULT_JOB_PROFILE_NAMES, LDE_ROLES } from '../../../support/constants';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import Permissions from '../../../support/dictionary/permissions';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import HubSearchResults from '../../../support/fragments/linked-data/hubSearchResults';
import EditHubPage from '../../../support/fragments/linked-data/editHubPage';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

describe('LDE Hubs: Test Suite Name', () => {
  const testData = {
    // MARC Authority file configuration
    marcAuthFilePath: 'marcAuthC375263.mrc',
    marcAuthFileName: `C000000_marcAuthFile${getRandomPostfix()}.mrc`,
    // Authority heading from marcAuthC375263.mrc file
    authorityHeading: 'Mediterranean Conference on Medical and Biological Engineering',
    roleIds: [],
  };
  const hubData = {
    preferredType: '"http://bibfra.me/vocab/library/Title"',
    preferredTitle: `Test Preferred Title ${getRandomLetters(5)}`,
    preferredTitleUpdated: '_Updated',
    partNumber: '1',
    partName: 'Part Name',
    otherTitle: 'Other Title',
    variantType: '"http://bibfra.me/vocab/library/VariantTitle"',
    variantTitle: `Variant Title ${getRandomLetters(5)}`,
    variantPartNumber: '2',
    variantPartName: 'Variant Part Name',
    variantOtherTitle: 'Variant Other Title',
    variantDate: '2024',
    variantTitleType: 'Variant Type',
    variantNote: 'Variant Note',
    languageCode: 'English (eng)',
    languageLabel: 'English',
    hubId: null,
  };

  before('Create test data', () => {
    cy.getAdminToken();

    roleNames.forEach((roleName) => {
      cy.getUserRoleIdByNameApi(roleName).then((roleId) => {
        if (roleId) {
          testData.roleIds.push(roleId);
        }
      });
    });

    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });

    cy.then(() => {
      if (testData.roleIds.length > 0) {
        cy.updateRolesForUserApi(user.userId, testData.roleIds);
      }
    });

    // Set MARC Authority files as active
    ManageAuthorityFiles.setAllDefaultFOLIOFilesToActiveViaAPI();

    // Upload MARC Authority file via API
    DataImport.uploadFileViaApi(
      testData.marcAuthFilePath,
      testData.marcAuthFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    ).then((createdRecords) => {
      testData.authorityId = createdRecords[0].authority.id;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();

    if (testData.hubId) {
      EditHubPage.deleteViaAPI(testData.hubId);
    }

    if (testData.authorityId) {
      MarcAuthority.deleteViaAPI(testData.authorityId, true);
    }
    ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.linkedDataEditor,
      waiter: LinkedDataEditor.waitLoading,
      authRefresh: true,
    });
  });

  it(
    'C987719 C1030042  Create and edit local hub (citation)',
    { tags: ['criticalPath', 'citation', 'C987719', 'C1030042'] },
    () => {
      SearchAndFilter.switchToHubsTab();
      SearchAndFilter.verifyActiveButtons(false);
      HubSearchResults.verifyNumberOfFoundRecords(0);
      SearchAndFilter.fillHubsSearchInput('*');
      SearchAndFilter.clickResetButton();
      SearchAndFilter.verifyActiveButtons(false);
      HubSearchResults.verifyEnterSearchCriteriaMessage();

      LinkedDataEditor.openNewHubForm();
      NewHub.waitLoading();
      NewHub.assignAuthority(testData.authorityHeading);
      NewHub.verifyActiveSaveButtons(true);

      NewHub.clickDuplicateTitleButton();
      NewHub.selectVariantTitleType();

      NewHub.fillVariantTitle(
        hubData.variantTitle,
        hubData.variantPartNumber,
        hubData.variantPartName,
        hubData.variantOtherTitle,
        hubData.variantDate,
        hubData.variantTitleType,
        hubData.variantNote,
      );

      NewHub.fillPreferredTitle(
        hubData.preferredTitle,
        hubData.partNumber,
        hubData.partName,
        hubData.otherTitle,
      );

      NewHub.fillLanguage(hubData.languageCode);
      NewHub.saveAndClose();
      cy.getAdminToken();
      HubSearchResults.verifyEnterSearchCriteriaMessage();

      SearchAndFilter.selectSourceLocalOption();
      SearchAndFilter.fillHubsSearchInput(
        '*',
        // hubData.variantTitle
      );

      // SearchAndFilter.fillHubsSearchInput(hubData.preferredTitle);
      HubSearchResults.verifyNumberOfFoundRecords(1);
      HubSearchResults.verifySearchResultsByTitle({
        creator: testData.authorityHeading,
        title: hubData.variantTitle,
        // title: hubData.preferredTitle,
        language: hubData.languageLabel,
        source: 'Local',
      });
      HubSearchResults.clickEditButtonByTitle(hubData.variantTitle);
      // HubSearchResults.clickEditButtonByTitle(hubData.preferredTitle);

      EditHubPage.waitLoading();
      EditHubPage.verifyCreatorOfHub(testData.authorityHeading);
      EditHubPage.verifyTitleInformation(
        hubData.variantType,
        hubData.variantTitle,
        hubData.variantPartNumber,
        hubData.variantPartName,
        hubData.variantOtherTitle,
        hubData.variantDate,
        hubData.variantTitleType,
        hubData.variantNote,
        hubData.preferredType,
        hubData.preferredTitle,
        hubData.partNumber,
        hubData.partName,
        hubData.otherTitle,
      );
      EditHubPage.verifyLanguageCode(hubData.languageCode);

      EditHubPage.updateTitle(hubData.preferredTitleUpdated);
      EditHubPage.saveAndKeepEditing().then((id) => {
        testData.hubId = id;
      });

      EditHubPage.saveAndClose();
      SearchAndFilter.switchToWorkInstancesTab();
      SearchAndFilter.switchToHubsTab();

      HubSearchResults.verifySearchResultsByTitle({
        creator: testData.authorityHeading,
        // title: `${hubData.preferredTitle}${hubData.preferredTitleUpdated}`,
        language: hubData.languageLabel,
        source: 'Local',
      });
      HubSearchResults.verifyNumberOfFoundRecords(1);
    },
  );
});
