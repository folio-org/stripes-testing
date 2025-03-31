import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import EditResource from '../../support/fragments/linked-data/editResource';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
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
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';

describe('Citation: MARC Authority integration', () => {
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
    searchOption: 'Keyword',
    marcValue: `Create a new MARC authority record with FOLIO authority file test ${getRandomPostfix()}`,
    tag001: '001',
    tag010: '010',
    tag100: '100',
    tag010Value: 'n00776432',
    tag001Value: 'n4332123',
    headerText: 'Create a new MARC authority record',
    AUTHORIZED: 'Authorized',
  };

  const resourceData = {
    creator: testData.uniqueCreator,
    language: 'spa',
    classificationNumber: 'PC4112',
    title: `${testData.uniqueTitle} TT test35 cultural approach to intermediate Spanish tk1 /`,
    isbnIdentifier: testData.uniqueIsbn,
    lccnIdentifier: 'aa1994901234',
    publisher: 'Scott, Foresman, test',
    publicationDate: '2024',
    edition: '3rd ed. test',
  };

  const newFields = [
    { previousFieldTag: '008', tag: '010', content: '$a n4332123 $z n 1234432333' },
    {
      previousFieldTag: '010',
      tag: '100',
      content: `$a ${testData.marcValue}`,
    },
  ];

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    cy.getAdminToken();
    // delete new authority related data
    MarcAuthority.deleteViaAPI(testData.authorityId, true);
    ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
    // delete LDE related data
    // delete inventory instance both from inventory and LDE modules
    // this might change later once corresponding instance will automatically get deleted in linked-data
    InventoryInstances.getInstanceIdApi({
      limit: 1,
      query: `title="${resourceData.title}"`,
    }).then((id) => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
    });
    Work.getInstancesByTitle(testData.uniqueTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === testData.uniqueTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
    // delete work
    Work.getIdByTitle(testData.uniqueTitle).then((id) => Work.deleteById(id));
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
    ManageAuthorityFiles.setAllDefaultFOLIOFilesToActiveViaAPI();
    DataImport.uploadFileViaApi(
      testData.modifiedMarcFile,
      testData.marcFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    );
  });

  beforeEach(() => {
    cy.loginAsAdmin({
      path: TopMenu.marcAuthorities,
      waiter: MarcAuthorities.waitLoading,
    });
  });

  it(
    'C633470 [User journey] LDE - Create new MARC authority (citation)',
    { tags: ['criticalPath', 'citation', 'linked-data-editor'] },
    () => {
      // create new authority via UI
      MarcAuthorities.clickActionsAndNewAuthorityButton();
      QuickMarcEditor.checkPaneheaderContains(testData.headerText);
      MarcAuthority.checkSourceFileSelectShown();
      MarcAuthority.selectSourceFile(testData.sourceName);
      QuickMarcEditor.checkContentByTag(testData.tag001, '');
      newFields.forEach((newField) => {
        MarcAuthority.addNewFieldAfterExistingByTag(
          newField.previousFieldTag,
          newField.tag,
          newField.content,
        );
      });
      QuickMarcEditor.checkContentByTag(testData.tag001, testData.tag001Value);
      QuickMarcEditor.checkContentByTag(testData.tag010, newFields[0].content);
      QuickMarcEditor.checkContentByTag(testData.tag100, newFields[1].content);
      QuickMarcEditor.pressSaveAndClose();
      cy.wait(1500);
      QuickMarcEditor.pressSaveAndClose();
      MarcAuthority.verifyAfterSaveAndClose();
      QuickMarcEditor.verifyPaneheaderWithContentAbsent(testData.headerText);
      MarcAuthority.getId().then((id) => {
        testData.authorityId = id;
      });
      // search for inventory item (created in precondition via data import) and edit it in LDE
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueTitle);
      InventoryInstance.editInstanceInLde();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading();
      // change authority to newly created one
      EditResource.clickEditWork();
      // change first creator of work section
      EditResource.selectChangeCreatorOfWork(1);
      EditResource.switchToSearchTabMarcAuthModal();
      // search by personal name
      EditResource.selectSearchParameterMarcAuthModal(MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME);
      EditResource.searchMarcAuthority(testData.marcValue);
      EditResource.selectAssignMarcAuthorityButton(1);
      EditResource.saveAndClose();
      // LDE filters are displayed indicating that edit form was closed
      SearchAndFilter.waitLoading();
      // search created work by title
      SearchAndFilter.searchResourceByTitle(testData.uniqueTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);
      // open work
      LinkedDataEditor.selectFromSearchTable(1);
      LinkedDataEditor.editWork();
      EditResource.waitLoading();
      // check that marc value is displayed on the 'creator of work' section
      EditResource.checkLabelTextValue('Creator of Work', testData.marcValue);
    },
  );
});
