import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Browse instance fields', () => {
    const testData = {
      instanceTitle: 'C877081 The \\Journal\\ of eccle\\\\siastical his\\\\tory\\\\.',
      contributor: 'C877081Dug\\more, C. W. (Clifford \\ William)',
      subject: {
        indexRow: 0,
        name: 'C877081Church history\\--Periodicals',
        source: 'Library of Congress Subject Headings',
        type: 'Topical term',
      },
      classification: 'C877081BR\\140 .\\\\J6',
      classificationEscaped: 'C877081BR\\\\140 .\\\\\\\\J6',
      marcFile: {
        marc: 'marcBibC877081.mrc',
        fileName: `testMarcFileC877081.${randomFourDigitNumber()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numberOfRecords: 1,
        propertyName: 'instance',
      },
    };

    const querySearchOption = {
      classifications: 'Query search',
      subjects: 'Subject',
      contributors: 'Contributor',
    };

    let instanceId;
    let instanceHrid;
    let user;

    before('Creating user and test data', () => {
      cy.getAdminToken();
      // Clean up any existing instances
      InventoryInstances.deleteInstanceByTitleViaApi('C877081*');
      // Import MARC bib
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        instanceHrid = response[0].instance.hrid;
        instanceId = response[0].instance.id;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C877081 Import MARC bib record with backslash character in some fields and check Instance detail view pane / browse pane (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C877081'] },
      () => {
        // Step 4. Check Instance detail view:
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyContributorNameWithoutMarcAppIcon(0, testData.contributor);
        InstanceRecordView.verifyInstanceSubject({
          indexRow: testData.subject.indexRow,
          subjectHeadings: testData.subject.name,
          subjectSource: testData.subject.source,
          subjectType: testData.subject.type,
        });
        InstanceRecordView.verifyClassification('LC', testData.classification);

        // Step 5. Go to "Inventory" > "Browse" and browse for classification from imported record
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption('Classification (all)');
        BrowseClassifications.waitForClassificationNumberToAppear(testData.classification);
        InventorySearchAndFilter.browseSearch(testData.classification);
        BrowseClassifications.verifySearchResultsTable();
        InventorySearchAndFilter.verifySearchResultIncludingValue(testData.classification);

        // Step 6. Click on found value
        BrowseClassifications.selectFoundValueByRow(5, testData.classification);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption.classifications,
          `classifications.classificationNumber=="${testData.classificationEscaped}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);

        // Step 7. Go to "Inventory" > "Browse" and browse for subject from imported record
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption('Subjects');
        InventorySearchAndFilter.browseSearch(testData.subject.name);
        InventorySearchAndFilter.verifySearchResultIncludingValue(testData.subject.name);

        // // Step 8. Click on the found result
        BrowseSubjects.verifyClickTakesToInventory(testData.subject.name);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption.subjects,
          testData.subject.name,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);

        // Step 9. Go to "Inventory" > "Browse" and browse for contributor from imported record
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption('Contributors');
        InventorySearchAndFilter.browseSearch(testData.contributor);
        InventorySearchAndFilter.verifySearchResultIncludingValue(testData.contributor);

        // Step 10. Click on the found result
        BrowseContributors.openRecord(testData.contributor);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption.contributors,
          testData.contributor,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
      },
    );
  });
});
