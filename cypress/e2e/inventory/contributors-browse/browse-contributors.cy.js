import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const testData = {
      item: {
        instanceName: `AT_contributorsBrowse_${getRandomPostfix()}`,
      },

      contributor: {
        name: `Test_Contributor_${getRandomPostfix()}`,
        nameC353660: `Test_Contributor_${getRandomPostfix()}`,
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

    const testValue = [
      `Snow, John_testValue_${getRandomPostfix()}`,
      `England_testValue_${getRandomPostfix()}`,
      `DE3_testValue_${getRandomPostfix()}`,
    ];

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiCallNumberBrowse.gui,
        Permissions.uiSubjectBrowse.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        InventoryInstances.deleteInstanceByTitleViaApi('AT_contributorsBrowse');
      });
    });

    beforeEach(() => {
      InventoryInstance.createInstanceViaApi({ instanceTitle: testData.item.instanceName }).then(
        ({ instanceData }) => {
          testData.instanceId = instanceData.instanceId;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventorySearchAndFilter.waitLoading,
            authRefresh: true,
          });
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
    });

    afterEach(() => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C353999 Verify that the "Instance" record with same "Contributor name", but different "Name type"and "Relator terms" displayed as 2 rows. (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C353999', 'eurekaPhase1'] },
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
        BrowseContributors.waitForContributorToAppear(testData.contributor.name);
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
      { tags: ['criticalPath', 'spitfire', 'C353660', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(testData.item.instanceName);
        InventorySearchAndFilter.selectSearchResultItem();
        InventorySearchAndFilter.clickEditInstance();

        InstanceRecordEdit.clickAddContributor();
        InstanceRecordEdit.fillContributorData(
          0,
          testData.contributor.nameC353660,
          testData.contributor.nameTypes.personal,
          testData.contributor.types.dancer,
        );
        InstanceRecordEdit.clickAddContributor();
        InstanceRecordEdit.fillContributorData(
          1,
          testData.contributor.nameC353660,
          testData.contributor.nameTypes.personal,
          testData.contributor.types.colorist,
        );
        InstanceRecordEdit.clickAddContributor();
        InstanceRecordEdit.fillContributorData(
          2,
          testData.contributor.nameC353660,
          testData.contributor.nameTypes.personal,
          testData.contributor.types.architect,
        );
        InstanceRecordEdit.saveAndClose();

        InventorySearchAndFilter.switchToBrowseTab();

        BrowseContributors.select();
        BrowseContributors.waitForContributorToAppear(testData.contributor.nameC353660);
        BrowseContributors.browse(testData.contributor.nameC353660);
        BrowseContributors.checkSearchResultRow(
          testData.contributor.nameC353660,
          testData.contributor.nameTypes.personal,
          `${testData.contributor.types.dancer}, ${testData.contributor.types.architect}, ${testData.contributor.types.colorist}`,
          '1',
          true,
        );
      },
    );

    it(
      'C356837 Verify that deleted Contributor on instance record with source = Folio does not display on browse result list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C356837', 'eurekaPhase1'] },
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
        BrowseContributors.waitForContributorToAppear(testData.contributor.name);
        BrowseContributors.browse(testData.contributor.name);
        BrowseContributors.checkSearchResultRow(
          testData.contributor.name,
          testData.contributor.nameTypes.personal,
          testData.contributor.types.architect,
          '1',
          true,
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

        BrowseContributors.waitForContributorToAppear(testData.contributor.name, false);
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseContributors.select();
        BrowseContributors.browse(testData.contributor.name);
        InventorySearchAndFilter.verifySearchResult(`${testData.contributor.name}would be here`);
      },
    );

    it(
      "C358148 Verify that switching between browse options doesn't submit a form (spitfire)",
      { tags: ['criticalPath', 'spitfire', 'C358148', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseContributors.select();
        BrowseContributors.browse(testValue[0]);
        InventorySearchAndFilter.verifySearchResult(`${testValue[0]}would be here`);
        InventorySearchAndFilter.verifyContributorsColumResult(`${testValue[0]}would be here`);

        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.verifySearchResult(`${testValue[0]}would be here`);
        InventorySearchAndFilter.verifyContributorsColumResult(`${testValue[0]}would be here`);
        InventorySearchAndFilter.browseSearch(testValue[1]);
        InventorySearchAndFilter.verifySearchResult(`${testValue[1]}would be here`);
        InventorySearchAndFilter.verifySubjectsResultsInBrowsePane();

        BrowseContributors.select();
        InventorySearchAndFilter.verifySearchResult(`${testValue[1]}would be here`);
        InventorySearchAndFilter.verifySubjectsResultsInBrowsePane();
        BrowseContributors.browse(testValue[0]);
        InventorySearchAndFilter.verifySearchResult(`${testValue[0]}would be here`);
        InventorySearchAndFilter.verifyContributorsColumResult(`${testValue[0]}would be here`);

        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.verifySearchResult(`${testValue[0]}would be here`);
        InventorySearchAndFilter.verifyContributorsColumResult(`${testValue[0]}would be here`);
        InventorySearchAndFilter.browseSearch(testValue[2]);
        InventorySearchAndFilter.verifySearchResult(`${testValue[2]}would be here`);
        InventorySearchAndFilter.verifyCallNumbersResultsInBrowsePane(
          `${testValue[2]}would be here`,
        );

        BrowseContributors.select();
        InventorySearchAndFilter.verifySearchResult(`${testValue[2]}would be here`);
        InventorySearchAndFilter.verifyCallNumbersResultsInBrowsePane(
          `${testValue[2]}would be here`,
        );
        BrowseContributors.browse(testValue[0]);
        InventorySearchAndFilter.verifySearchResult(`${testValue[0]}would be here`);
      },
    );
  });
});
