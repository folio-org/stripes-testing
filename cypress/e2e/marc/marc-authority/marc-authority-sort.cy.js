import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('marc', () => {
  describe('MARC Authority', () => {
    const testData = {
      authority: {
        title: 'Type of heading test',
        searchOption: 'Keyword',
        all: '*',
      },

      facetOptions: {
        optionA: 'Thesaurus for Graphic Materials (TGM)',
        optionB: 'GSAFD Genre Terms (GSAFD)',
        optionC: 'Not specified',
      },

      facetValues: {
        valueA: 'Postcards (with "tgm" in 010)',
        valueB: 'GSAFD Genre (for test)',
        valueC: 'Stone, Robert B (not from pre-defined list)',
      },

      prefixValues: {
        // eslint-disable-next-line no-tabs
        prefixValA: '010	   	$a tgm',
        // eslint-disable-next-line no-tabs
        prefixValB: '010	   	$a gsafd',
        // eslint-disable-next-line no-tabs
        prefixValC: '010	   	$a ',
      },
    };
    const marcFiles = [
      {
        marc: 'marcFileForC350579.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 2,
      },
      {
        marc: 'marcFileForC365113.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 19,
      },
    ];

    const createdAuthorityIDs = [];

    const headingTypes = ['Corporate Name', 'Personal Name'];
    const marcAuthorities = {
      authorizedReferences: ['Authorized', 'Authorized', 'Reference'],
      headingReferences: [
        'Type of heading test a',
        'Type of heading test b',
        'Type of heading test c',
      ],
      typeOfHeadings: ['Corporate Name', 'Corporate Name', 'Personal Name'],
    };

    before(() => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;
        },
      );

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.waitFileIsUploaded();
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdAuthorityIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });
    });

    beforeEach(() => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });

    after(() => {
      cy.getAdminToken();
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C365113 Apply "Authority source" facet to the search result list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'nonParallel'] },
      () => {
        MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.all);
        MarcAuthorities.checkResultsListRecordsCountGreaterThan(0);
        MarcAuthorities.checkAuthoritySourceOptions();
        MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.optionA);
        MarcAuthorities.checkSelectedAuthoritySource(testData.facetOptions.optionA);
        MarcAuthorities.checkValueResultsColumn(4, testData.facetOptions.optionA);
        MarcAuthorities.checkValueResultsColumn(2, testData.facetValues.valueA);
        MarcAuthorities.selectTitle(testData.facetValues.valueA);
        MarcAuthority.contains(testData.prefixValues.prefixValA);
        MarcAuthorities.closeAuthoritySourceOption();

        MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.optionB);
        MarcAuthorities.checkSelectedAuthoritySource(testData.facetOptions.optionB);
        MarcAuthorities.checkValueResultsColumn(4, testData.facetOptions.optionB);
        MarcAuthorities.checkValueResultsColumn(2, testData.facetValues.valueB);
        MarcAuthorities.selectTitle(testData.facetValues.valueB);
        MarcAuthority.contains(testData.prefixValues.prefixValB);
        MarcAuthorities.closeAuthoritySourceOption();

        MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.optionC);
        MarcAuthorities.checkSelectedAuthoritySource(testData.facetOptions.optionC);
        MarcAuthorities.checkValueResultsColumn(5, '');
        MarcAuthorities.checkValueResultsColumn(2, testData.facetValues.valueC);
        MarcAuthorities.selectTitle(testData.facetValues.valueC);
        MarcAuthority.contains(testData.prefixValues.prefixValC);
        InventoryInstance.closeAuthoritySource();
        MarcAuthorities.checkSearchOption('keyword');
        MarcAuthorities.checkSearchInput(testData.authority.all);
      },
    );

    it(
      'C350579 Sorting and displaying results of search authority records by "Actions" dropdown menu (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'parallel'] },
      () => {
        MarcAuthorities.checkSearchOptions();
        MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
        MarcAuthorities.chooseTypeOfHeading(headingTypes);

        MarcAuthorities.clickActionsButton();
        MarcAuthorities.actionsSortBy('Authorized/Reference');
        MarcAuthorities.checkRowsContent(marcAuthorities.authorizedReferences);
        MarcAuthorities.actionsSortBy('Heading/Reference');
        MarcAuthorities.checkRowsContent(marcAuthorities.headingReferences);
        MarcAuthorities.actionsSortBy('Type of heading');
        MarcAuthorities.checkRowsContent(marcAuthorities.typeOfHeadings);

        MarcAuthorities.actionsSelectCheckbox('Authorized/Reference');
        MarcAuthorities.checkColumnAbsent('Authorized/Reference');
        MarcAuthorities.actionsSelectCheckbox('Type of heading');
        MarcAuthorities.checkColumnAbsent('Type of heading');
        MarcAuthorities.actionsSelectCheckbox('Number of titles');
        MarcAuthorities.checkColumnAbsent('Number of titles');
        MarcAuthorities.actionsSelectCheckbox('Authority source');
        MarcAuthorities.checkColumnAbsent('Authority source');

        MarcAuthorities.actionsSelectCheckbox('Authorized/Reference');
        MarcAuthorities.actionsSelectCheckbox('Type of heading');
        MarcAuthorities.actionsSelectCheckbox('Number of titles');
        MarcAuthorities.actionsSelectCheckbox('Authority source');
        MarcAuthorities.checkColumnExists('Authorized/Reference');
        MarcAuthorities.checkColumnExists('Type of heading');
        MarcAuthorities.checkColumnExists('Number of titles');
        MarcAuthorities.checkColumnExists('Authority source');

        MarcAuthorities.clickResetAndCheck(testData.authority.searchOption);
      },
    );
  });
});
