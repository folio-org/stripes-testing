import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../../support/constants';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    const users = {};
    const createdRecordIDs = [];
    const searchValue = 'C404417 Auth';
    const headLine = 'Shared MARC authority record';
    const marcFiles = [
      {
        marc: 'marcBibFileForC404417Central.mrc',
        fileName: `C404417 Shared testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        title: 'C404417 Sleeping in the ground : an Inspector Banks novel / Peter Jackson.',
        tenant: tenantNames.central,
        propertyName: 'instance',
        numOfRecords: 1,
      },
      {
        marc: 'marcAuthFileForC404417Central.mrc',
        fileName: `C404417 Central testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        tenant: tenantNames.central,
        propertyName: 'authority',
        numOfRecords: 2,
      },
      {
        marc: 'marcAuthFileForC404417LocalMember1.mrc',
        fileName: `C404417 Local testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        tenant: tenantNames.college,
        propertyName: 'authority',
        numOfRecords: 1,
      },
    ];
    const headingLocalRecord = 'C404417 Auth Member Local';
    const headingsSharedRecords = [
      'C404417 Auth Shared 1',
      'C404417 Auth Shared 2',
      'C404417 Auth Shared 1 - 400 field',
    ];
    const accordion = {
      name: 'References',
      option: 'Exclude see from',
    };

    before('Create users, data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C404417 Auth');
      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ])
        .then((userProperties) => {
          users.userProperties = userProperties;
        })
        .then(() => {
          cy.resetTenant();
          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            if (marcFile.tenant === tenantNames.college) {
              cy.setTenant(Affiliations.College);
            } else {
              cy.resetTenant();
            }

            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        })
        .then(() => {
          cy.resetTenant();
          cy.login(users.userProperties.username, users.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            InventoryInstances.searchByTitle(marcFiles[0].title);
            InventoryInstances.selectInstance();
            InventoryInstance.verifyInstanceTitle(marcFiles[0].title);
          });
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(users.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      MarcAuthority.deleteViaAPI(createdRecordIDs[2]);

      cy.setTenant(Affiliations.College);
      MarcAuthority.deleteViaAPI(createdRecordIDs[3]);
    });

    it(
      'C404417 Searching/browsing for "MARC Authority" records in "MARC Authority" plug-in on Central tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C404417'] },
      () => {
        // 1 Click "Actions" button in the third pane → Select "Edit MARC bibliographic record" option.
        InventoryInstance.editMarcBibliographicRecord();

        // 2 Click on "Link to MARC Authority record" icon displayed next to one of the fields (e.g., "800" field)
        InventoryInstance.verifyAndClickLinkIcon('800');
        InventoryInstance.verifySelectMarcAuthorityModal();

        // 3 Select "Search" toggle in the first pane of a modal
        MarcAuthorities.switchToSearch();
        MarcAuthorities.verifyAbsenceOfSharedAccordion();

        // 4 Fill search input field with query which will return all "MARC Authority" records from Preconditions
        // (e.g., "C404417 Auth" ) → Click "Search" button.
        MarcAuthorities.searchByParameter(MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME, searchValue);
        headingsSharedRecords.forEach((heading, index) => {
          MarcAuthorities.verifyResultsRowContent(heading);
          MarcAuthorities.verifySharedIcon(index);
        });

        // 5 Click on the "Heading/Reference" value for any record in the results list.
        MarcAuthorities.selectRecordByIndex(0);
        MarcAuthorities.verifyViewPaneContentExists();
        MarcAuthorities.checkSharedTextInDetailView();
        MarcAuthorities.checkHeadlineInBoldExistsInMarkViewPaneContent(headLine);

        // 6 Select "Exclude see from" checkbox in "References" accordion at the first pane in modal
        MarcAuthorities.clickAccordionByName(accordion.name);
        MarcAuthorities.actionsSelectCheckbox(accordion.option);
        headingsSharedRecords.slice(0, 2).forEach((heading) => {
          MarcAuthorities.verifyResultsRowContent(heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(heading, true);
        });

        // 7 Select "Browse" toggle at the first pane in modal
        // Fill browse input field with query which will return all "MARC Authority" records from Preconditions (e.g., "C404417 Auth" )
        // Click "Search" button

        MarcAuthorities.switchToBrowse();
        MarcAuthorities.searchByParameter(MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME, searchValue);
        headingsSharedRecords.forEach((heading, index) => {
          MarcAuthorities.verifyResultsRowContent(heading);
          MarcAuthorities.verifySharedIcon(index);
        });
        MarcAuthorities.checkRowAbsentByContent(headingLocalRecord);

        // 8 Select "Exclude see from" checkbox in "References" accordion at the first pane in modal
        MarcAuthorities.clickAccordionByName(accordion.name);
        MarcAuthorities.actionsSelectCheckbox(accordion.option);
        headingsSharedRecords.slice(0, 2).forEach((heading) => {
          MarcAuthorities.verifyResultsRowContent(heading);
          MarcAuthorities.verifyResultRowContentSharedIcon(heading, true);
        });
        MarcAuthorities.checkRowAbsentByContent(headingLocalRecord);

        // 9 Click on the "Heading/Reference" value for any record from Preconditions in the results list
        // (i.e., with "Heading/Reference" starting with "C404417 Auth")
        MarcAuthorities.selectTitle(`Shared\n${headingsSharedRecords[0]}`);
        MarcAuthorities.verifyViewPaneContentExists();
        MarcAuthorities.checkSharedTextInDetailView();
        MarcAuthorities.checkHeadlineInBoldExistsInMarkViewPaneContent(headLine);
      },
    );
  });
});
