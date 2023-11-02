import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory -> Contributors Browse', () => {
  const testData = {
    item: {
      instanceName: `testContributorsBrowse_${getRandomPostfix()}`,
      itemBarcode: getRandomPostfix(),
    },

    contributor: {
      name: `Test_Contributor_${getRandomPostfix()}`,
      nameTypes: {
        personal: 'Personal name',
        corporate: 'Corporate name',
        meeting: 'Meeting name',
      },
      types: {
        actor: 'Actor',
        addressee: 'Addressee',
        adapter: 'Adapter',
        colorist: 'Colorist',
        architect: 'Architect',
        dancer: 'Dancer',
      },
    },
  };

  const testValue = `testValue_${getRandomPostfix()}`;

  before(() => {
    cy.createTempUser([
      Permissions.uiInventoryViewCreateEditInstances.gui,
      Permissions.uiCallNumberBrowse.gui,
      Permissions.uiSubjectBrowse.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
  });

  beforeEach(() => {
    InventoryInstances.createInstanceViaApi(testData.item.instanceName, testData.item.itemBarcode);
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
    });
  });

  after(() => {
    Users.deleteViaApi(testData.userProperties.userId);
  });

  afterEach(() => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.itemBarcode);
  });

  it(
    'C353999 Verify that the "Instance" record with same "Contributor name", but different "Name type"and "Relator terms" displayed as 2 rows. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.item.instanceName);
      InventorySearchAndFilter.selectSearchResultItem();
      InventorySearchAndFilter.clickEditInstance();

      InstanceRecordEdit.clickAddContributor();
      InstanceRecordEdit.fillContributorData(
        0,
        testData.contributor.name,
        testData.contributor.nameTypes.personal,
        testData.contributor.types.actor,
      );
      InstanceRecordEdit.clickAddContributor();
      InstanceRecordEdit.fillContributorData(
        1,
        testData.contributor.name,
        testData.contributor.nameTypes.corporate,
        testData.contributor.types.addressee,
      );
      InstanceRecordEdit.clickAddContributor();
      InstanceRecordEdit.fillContributorData(
        2,
        testData.contributor.name,
        testData.contributor.nameTypes.meeting,
        testData.contributor.types.adapter,
      );
      InstanceRecordEdit.saveAndClose();

      InventorySearchAndFilter.switchToBrowseTab();

      BrowseContributors.select();
      BrowseContributors.browse(testData.contributor.name);
      BrowseContributors.checkSearchResultRow(
        testData.contributor.name,
        testData.contributor.nameTypes.personal,
        testData.contributor.types.actor,
        '1',
      );
      BrowseContributors.checkSearchResultRow(
        testData.contributor.name,
        testData.contributor.nameTypes.corporate,
        testData.contributor.types.addressee,
        '1',
      );
      BrowseContributors.checkSearchResultRow(
        testData.contributor.name,
        testData.contributor.nameTypes.meeting,
        testData.contributor.types.adapter,
        '1',
      );
    },
  );

  it(
    'C353660 Verify that the "Contributor name" from the same "Instance" record", with the same "Name type", but different "Relator terms" counted once at browse result list. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.item.instanceName);
      InventorySearchAndFilter.selectSearchResultItem();
      InventorySearchAndFilter.clickEditInstance();

      InstanceRecordEdit.clickAddContributor();
      InstanceRecordEdit.fillContributorData(
        0,
        testData.contributor.name,
        testData.contributor.nameTypes.personal,
        testData.contributor.types.dancer,
      );
      InstanceRecordEdit.clickAddContributor();
      InstanceRecordEdit.fillContributorData(
        1,
        testData.contributor.name,
        testData.contributor.nameTypes.personal,
        testData.contributor.types.colorist,
      );
      InstanceRecordEdit.clickAddContributor();
      InstanceRecordEdit.fillContributorData(
        2,
        testData.contributor.name,
        testData.contributor.nameTypes.personal,
        testData.contributor.types.architect,
      );
      InstanceRecordEdit.saveAndClose();

      InventorySearchAndFilter.switchToBrowseTab();

      BrowseContributors.select();
      BrowseContributors.browse(testData.contributor.name);
      BrowseContributors.checkSearchResultRecord(testData.contributor.name);
      BrowseContributors.checkSearchResultRow(
        testData.contributor.name,
        testData.contributor.nameTypes.personal,
        `${testData.contributor.types.dancer}, ${testData.contributor.types.architect}, ${testData.contributor.types.colorist}`,
        '1',
      );
    },
  );

  it(
    'C356837 Verify that deleted Contributor on instance record with source = Folio does not display on browse result list (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.item.instanceName);
      InventorySearchAndFilter.selectSearchResultItem();
      InventorySearchAndFilter.clickEditInstance();

      InstanceRecordEdit.clickAddContributor();
      InstanceRecordEdit.fillContributorData(
        0,
        testData.contributor.name,
        testData.contributor.nameTypes.personal,
        testData.contributor.types.architect,
      );
      InstanceRecordEdit.saveAndClose();

      InventorySearchAndFilter.switchToBrowseTab();
      BrowseContributors.select();
      BrowseContributors.browse(testData.contributor.name);
      BrowseContributors.checkSearchResultRecord(testData.contributor.name);
      BrowseContributors.checkSearchResultRow(
        testData.contributor.name,
        testData.contributor.nameTypes.personal,
        testData.contributor.types.architect,
        '1',
      );

      BrowseContributors.openRecord(testData.contributor.name);
      InventoryInstance.checkInstanceButtonExistence();
      InventorySearchAndFilter.verifyInstanceDetailsView();
      InventorySearchAndFilter.verifyInstanceDisplayed(testData.item.instanceName);
      InventoryInstance.checkPresentedText(testData.item.instanceName);
      InventoryInstance.checkContributor(testData.contributor.name);
      InventorySearchAndFilter.clickEditInstance();
      InstanceRecordEdit.deleteContributor(1);
      InstanceRecordEdit.saveAndClose();

      InventorySearchAndFilter.switchToBrowseTab();
      BrowseContributors.select();
      BrowseContributors.browse(testData.contributor.name);
      InventorySearchAndFilter.verifySearchResult(`${testData.contributor.name}would be here`);
    },
  );

  it(
    "C358148 Verify that switching between browse options doesn't submit a form (spitfire)",
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.switchToBrowseTab();
      BrowseContributors.select();
      BrowseContributors.browse(testValue);
      InventorySearchAndFilter.verifySearchResult(`${testValue}would be here`);

      InventorySearchAndFilter.selectBrowseSubjects();
      InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
      InventorySearchAndFilter.browseSearch(testValue);
      InventorySearchAndFilter.verifySearchResult(`${testValue}would be here`);

      BrowseContributors.select();
      InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
      BrowseContributors.browse(testValue);
      InventorySearchAndFilter.verifySearchResult(`${testValue}would be here`);

      InventorySearchAndFilter.selectBrowseCallNumbers();
      InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
      InventorySearchAndFilter.browseSearch(testValue);
      InventorySearchAndFilter.verifySearchResult(`${testValue}would be here`);

      BrowseContributors.select();
      InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
      BrowseContributors.browse(testValue);
      InventorySearchAndFilter.verifySearchResult(`${testValue}would be here`);
    },
  );
});
