import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../support/utils/stringTools';
import EditResource from '../../support/fragments/linked-data/editResource';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
  LDE_ROLES,
  EDIT_RESOURCE_HEADINGS,
} from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import ManageAuthorityFiles from '../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import PreviewResource from '../../support/fragments/linked-data/previewResource';
import FileManager from '../../support/utils/fileManager';
import DataImport from '../../support/fragments/data_import/dataImport';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import Marigold from '../../support/fragments/linked-data/marigold';
import UncontrolledAuthModal from '../../support/fragments/linked-data/uncontrolledAuthModal';
import Users from '../../support/fragments/users/users';
import Permissions from '../../support/dictionary/permissions';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

describe('Citation: MARC Authority integration', () => {
  const randomDigits = `${randomFourDigitNumber()}${randomFourDigitNumber()}`;
  const testData = {
    // lde related test data
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C633470 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C633470 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
    uniqueInstanceTitle: `Instance AQA title ${getRandomPostfix()}`,
    callNumber: '331.2',
    // new authority related test data
    sourceName: 'LC Name Authority file (LCNAF)',
    authorityHeading: `C633470_MarcAuthority_${getRandomPostfix()}`,
    searchOption: 'Keyword',
    marcValue: `Create a new MARC authority record with FOLIO authority file test ${getRandomPostfix()}`,
    tag001: '001',
    tag008: '008',
    tag010: '010',
    tag100: '100',
    tag010Value: 'n00776432',
    tag001Value: 'n4332123',
    headerText: /New .*MARC authority record/,
    AUTHORIZED: 'Authorized',
    roleIds: [],
    workId: null,
    instanceId: null,
  };

  const newFields = [
    {
      previousFieldTag: testData.tag008,
      tag: testData.tag010,
      content: `$a n651478${randomDigits}`,
    },
    {
      previousFieldTag: testData.tag010,
      tag: testData.tag100,
      content: `$a ${testData.authorityHeading}`,
      indicator0: '1',
    },
  ];

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    cy.getAdminToken();
    MarcAuthority.deleteViaAPI(testData.authorityId, true);
    ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId) Work.deleteById(testData.workId);
    Users.deleteViaApi(user.userId);
  });

  before('Prepare MARC settings', () => {
    // Set unique title, ISBN and Creator for searching
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ["!A Alice's Adventures in Wonderland", '123456789123456', 'Neale-Silva, Eduardo'],
      [testData.uniqueTitle, testData.uniqueIsbn, testData.uniqueCreator],
    );
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

    ManageAuthorityFiles.setAllDefaultFOLIOFilesToActiveViaAPI();
    DataImport.uploadFileViaApi(
      testData.modifiedMarcFile,
      testData.marcFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    );
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.marcAuthorities,
      waiter: MarcAuthorities.waitLoading,
      authRefresh: true,
    });
  });

  it(
    'C633470 [User journey] Marigold - Create new MARC authority (citation)',
    { tags: ['criticalPath', 'shiftLeft', 'citation', 'C633470', 'marigold'] },
    () => {
      // create new authority via UI
      MarcAuthorities.clickActionsAndNewAuthorityButton();
      QuickMarcEditor.checkPaneheaderContains(testData.headerText);
      MarcAuthority.setValid008DropdownValues();
      MarcAuthority.checkSourceFileSelectShown();
      MarcAuthority.selectSourceFile(testData.sourceName);
      QuickMarcEditor.checkContentByTag(testData.tag001, '');
      newFields.forEach((newField) => {
        MarcAuthority.addNewFieldAfterExistingByTag(
          newField.previousFieldTag,
          newField.tag,
          newField.content,
          newField.indicator0,
          newField.indicator1,
        );
      });
      QuickMarcEditor.checkContentByTag(testData.tag010, newFields[0].content);
      QuickMarcEditor.checkContentByTag(testData.tag100, newFields[1].content);
      QuickMarcEditor.pressSaveAndCloseButton();
      cy.wait(1500);
      MarcAuthority.verifyAfterSaveAndClose();
      QuickMarcEditor.verifyPaneheaderWithContentAbsent(testData.headerText);
      MarcAuthority.getId().then((id) => {
        testData.authorityId = id;
      });
      cy.wait(2000);
      // search for inventory item (created in precondition via data import) and edit it in LDE
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      // change authority to newly created one
      EditResource.clickEditWork();
      // change first creator of work section
      EditResource.selectChangeCreatorOfWork(1);
      EditResource.switchToSearchTabMarcAuthModal();
      // search by personal name
      EditResource.selectSearchParameterMarcAuthModal(MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME);
      EditResource.searchMarcAuthority(testData.authorityHeading);
      EditResource.selectAssignMarcAuthorityButton(1);
      EditResource.saveAndCloseWithIds().then(({ workId, instanceId }) => {
        testData.workId = workId;
        testData.instanceId = instanceId;
      });
      // close uncontrolled authority modal
      UncontrolledAuthModal.closeIfDisplayed();
      // LDE filters are displayed indicating that edit form was closed
      SearchAndFilter.waitLoading();
      // search created work by title
      SearchAndFilter.searchResourceByTitle(testData.uniqueTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);
      // open work
      Marigold.selectFromSearchTable(1);
      Marigold.editWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      // check that marc value is displayed on the 'creator of work' section
      EditResource.checkLabelTextValue('Creator of Work', testData.authorityHeading);
    },
  );
});
