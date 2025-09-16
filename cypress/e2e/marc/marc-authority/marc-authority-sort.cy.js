import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('MARC', () => {
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
        valueA: 'C365113 Postcards (with "tgm" in 010)',
        valueB: 'C365113 GSAFD Genre (for test)',
        valueC: 'C365113 Stone, Robert B (not from pre-defined list)',
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
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 2,
        propertyName: 'authority',
      },
      {
        marc: 'marcFileForC365113.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 19,
        propertyName: 'authority',
      },
    ];

    const createdAuthorityIDs = [];

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
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('Type of heading test');
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C365113');
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;
        },
      );
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
      { tags: ['criticalPath', 'spitfire', 'C365113'] },
      () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          marcFiles[1].marc,
          marcFiles[1].fileName,
          marcFiles[1].jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record[marcFiles[1].propertyName].id);
          });
        });
        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          cy.reload();
          MarcAuthorities.waitLoading();
        }, 20_000);
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
      { tags: ['criticalPath', 'spitfire', 'C350579'] },
      () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          marcFiles[0].marc,
          marcFiles[0].fileName,
          marcFiles[0].jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record[marcFiles[0].propertyName].id);
          });
        });
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        MarcAuthorities.checkSearchOptions();
        MarcAuthoritiesSearch.verifyDefaultSearchPaneState();

        MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
        cy.wait(2000);
        MarcAuthorities.verifyResultsPane();
        MarcAuthorities.clickActionsButton();
        MarcAuthorities.verifyActionsMenu(true, true);

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
